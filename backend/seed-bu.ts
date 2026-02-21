import { parse } from "csv-parse/sync";
import fs from "fs";
import { db } from "./src/db";
import { businessUnits, companies } from "./src/db/schema";
import { geocodeAddress } from "./src/services/geocode";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedBusinessUnits() {
  console.log("Seeding business units with geocoding...");

  const compResult = await db.select().from(companies).limit(1);
  if (compResult.length === 0) {
    console.log("No companies found. Create a company first.");
    process.exit(1);
  }
  const companyId = compResult[0].id;

  let content = fs.readFileSync("../NU-hackaton/business_units.csv", "utf8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });

  // Clear existing business units for this company to re-seed
  const existing = await db.select().from(businessUnits);
  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing units, skipping seed.`);
    process.exit(0);
  }

  for (const r of records) {
    const office = r["Офис"];
    const address = r["Адрес"];
    if (!office) continue;

    // Geocode using Nominatim
    const fullQuery = `${office}, ${address}, Казахстан`;
    console.log(`  Geocoding: ${office}...`);
    const coords = await geocodeAddress(fullQuery);

    await db.insert(businessUnits).values({
      companyId,
      office,
      address,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    });

    console.log(
      `  ✓ ${office}: ${coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : "no coords"}`
    );

    // Nominatim rate limit: max 1 request per second
    await sleep(1100);
  }

  console.log("Done seeding business units with geocoding!");
}

seedBusinessUnits()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error", err);
    process.exit(1);
  });
