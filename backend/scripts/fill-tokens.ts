import { db } from "../src/db";
import { companies } from "../src/db/schema";
import { isNull, eq } from "drizzle-orm";

async function main() {
  const existing = await db.select().from(companies).where(isNull(companies.apiToken));
  console.log(`Found ${existing.length} companies without tokens.`);

  for (const c of existing) {
    const token = crypto.randomUUID();
    await db.update(companies).set({ apiToken: token }).where(eq(companies.id, c.id));
    console.log(`Updated company ${c.id} (${c.name}) with token ${token}`);
  }
}

main().catch(console.error);
