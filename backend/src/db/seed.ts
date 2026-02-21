import "dotenv/config";
import { db } from "./index";
import {
  assignments,
  businessUnits,
  managers,
  ticketAnalysis,
  tickets,
} from "./schema";

// ── Helpers ─────────────────────────────────────────────────────────────
function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Data ────────────────────────────────────────────────────────────────

const CITIES = ["Астана", "Алматы", "Шымкент"];
const OFFICES = [
  {
    office: "ALA-1",
    city: "Алматы",
    address: "пр. Абая 10",
    lat: 43.238949,
    lng: 76.889709,
  },
  {
    office: "ALA-2",
    city: "Алматы",
    address: "ул. Розыбакиева 247A",
    lat: 43.204555,
    lng: 76.892695,
  },
  {
    office: "AST-1",
    city: "Астана",
    address: "Мәңгілік Ел 55",
    lat: 51.08882,
    lng: 71.416201,
  },
  {
    office: "AST-2",
    city: "Астана",
    address: "ул. Достык 16",
    lat: 51.127453,
    lng: 71.428781,
  },
  {
    office: "SHY-1",
    city: "Шымкент",
    address: "пр. Тауке хана 43",
    lat: 42.318855,
    lng: 69.596041,
  },
];

const MANAGERS = [
  {
    name: "Анна К.",
    office: "ALA-1",
    skills: ["Жалоба", "Консультация", "RU", "ENG"],
  },
  { name: "Ильяс М.", office: "ALA-1", skills: ["Смена данных", "RU", "KZ"] },
  {
    name: "Айзада Т.",
    office: "ALA-2",
    skills: ["Неработоспособность приложения", "Претензия", "RU", "KZ"],
  },
  {
    name: "Дмитрий В.",
    office: "AST-1",
    skills: ["Мошеннические действия", "Жалоба", "RU"],
  },
  {
    name: "Сабина Н.",
    office: "AST-1",
    skills: ["Консультация", "Смена данных", "RU", "KZ", "ENG"],
  },
  { name: "Олжас Б.", office: "AST-2", skills: ["VIP", "Жалоба", "RU", "KZ"] },
  {
    name: "Тимур Р.",
    office: "SHY-1",
    skills: ["Претензия", "Консультация", "RU", "KZ"],
  },
];

const TYPES = [
  "Жалоба",
  "Смена данных",
  "Консультация",
  "Претензия",
  "Неработоспособность приложения",
  "Мошеннические действия",
  "Спам",
];
const SENTIMENTS = [
  "Позитивный",
  "Нейтральный",
  "Негативный",
  "Негативный",
  "Негативный",
]; // skewed negative for realism
const SEGMENTS = ["Mass", "Mass", "Mass", "Mass", "VIP", "Priority"];
const LANGS = ["RU", "RU", "RU", "KZ", "KZ", "ENG"];
const SOURCES = ["MobileApp", "Web", "TelegramBot", "WhatsApp", "Email"];

async function seed() {
  console.log("🌱 Starting DB Seeding...");

  try {
    // 1. Clear existing data
    console.log("🧹 Clearing tables...");
    await db.delete(assignments);
    await db.delete(ticketAnalysis);
    await db.delete(tickets);
    await db.delete(managers);
    await db.delete(businessUnits);

    // 2. Insert Offices
    console.log("🏢 Inserting Business Units...");
    const insertedOffices = await db
      .insert(businessUnits)
      .values(
        OFFICES.map((o) => ({
          office: o.office,
          address: o.address,
          latitude: o.lat,
          longitude: o.lng,
        })),
      )
      .returning();
    const officeIdMap = Object.fromEntries(
      insertedOffices.map((o) => [o.office, o.id]),
    );

    // 3. Insert Managers
    console.log("👨‍💻 Inserting Managers...");
    const insertedManagers = await db
      .insert(managers)
      .values(
        MANAGERS.map((m) => ({
          name: m.name,
          position: "Support Agent",
          office: m.office,
          skills: m.skills,
          currentLoad: randInt(1, 15), // Random realistic load
        })),
      )
      .returning();

    // 4. Insert Tickets & Analysis & Assignments
    console.log("🎟️ Generating 150 test tickets...");
    const TICKETS_COUNT = 150;

    for (let i = 0; i < TICKETS_COUNT; i++) {
      const city = randItem(CITIES);
      const isAlmaty = city === "Алматы";
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lngOffset = (Math.random() - 0.5) * 0.1;

      const cityLat = city === "Астана" ? 51.1 : isAlmaty ? 43.2 : 42.3;
      const cityLng = city === "Астана" ? 71.4 : isAlmaty ? 76.9 : 69.6;

      const type = randItem(TYPES);
      const sentiment =
        type === "Жалоба" || type === "Претензия"
          ? "Негативный"
          : randItem(SENTIMENTS);

      // a. Ticket
      const [ticket] = await db
        .insert(tickets)
        .values({
          guid: `TK-${Date.now()}-${randInt(1000, 9999)}`,
          gender: randItem(["M", "F"]),
          segment: randItem(SEGMENTS),
          country: "KZ",
          city,
          source: randItem(SOURCES),
          latitude: cityLat + latOffset,
          longitude: cityLng + lngOffset,
        })
        .returning();

      // b. Analysis
      const priorityStr =
        sentiment === "Негативный" ? 9 : sentiment === "Нейтральный" ? 5 : 2;

      const [analysis] = await db
        .insert(ticketAnalysis)
        .values({
          ticketId: ticket.id,
          ticketType: type,
          sentiment: sentiment,
          priority: priorityStr + randInt(-1, 1),
          language: randItem(LANGS),
          summary: `Автосгенерированное саммари для билета ${ticket.guid}`,
        })
        .returning();

      // c. Assignment (Assign to a random manager in the matching city, or just random)
      const availableManagers = insertedManagers.filter(
        (m) =>
          (city === "Астана" && m.office?.startsWith("AST")) ||
          (isAlmaty && m.office?.startsWith("ALA")) ||
          (city === "Шымкент" && m.office?.startsWith("SHY")),
      );

      const selectedManager =
        availableManagers.length > 0
          ? randItem(availableManagers)
          : randItem(insertedManagers); // fallback if none match

      await db.insert(assignments).values({
        ticketId: ticket.id,
        analysisId: analysis.id,
        managerId: selectedManager.id,
        officeId: officeIdMap[selectedManager.office ?? "ALA-1"],
        assignmentReason: `Assigned based on AI routing (Simulated, skill match: ${selectedManager.skills?.includes(type) ? "Yes" : "No"})`,
      });
    }

    console.log("✅ Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
