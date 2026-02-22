import { cookie } from "@elysiajs/cookie";
import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import * as xlsx from "xlsx";
import { db } from "../db";
import { tickets } from "../db/schema";

// We'll store parsed previews in memory temporarily keyed by a random ID for the scope of the hackathon.
// In a real app, this might go to Redis.
const previewStore = new Map<string, any[]>();

export const dataLoaderRoutes = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super-secret-key-change-me",
    }),
  )
  .use(cookie())
  .group("/api/data", (app) =>
    app
      // Middleware to extract user from JWT
      .derive(async ({ jwt, cookie: { auth_token } }) => {
        if (!auth_token || !auth_token.value) return { user: null };
        const payload = await jwt.verify(auth_token.value as string);
        return { user: payload };
      })
      .post("/preview", async ({ body, user }) => {
        if (!user || user.role !== "ADMIN")
          return { error: "Unauthorized. Admin required." };

        const file = body?.file as unknown as File | undefined;
        const url = body?.url as string | undefined;

        if (!file && !url) return { error: "Either File or URL required" };

        let parsedData: any[] = [];

        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (file.name.endsWith(".csv")) {
            const text = buffer.toString("utf-8");
            const result = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
            });
            parsedData = result.data as any[];
          } else if (
            file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls")
          ) {
            const workbook = xlsx.read(buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            parsedData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
          } else if (file.name.endsWith(".json")) {
            const text = buffer.toString("utf-8");
            parsedData = JSON.parse(text);
          } else {
            return { error: "Unsupported format. Use CSV, XLSX, or JSON." };
          }
        } else if (url) {
          const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (!match) return { error: "Invalid Google Sheets URL" };
          const sheetId = match[1];
          const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

          try {
            const res = await fetch(exportUrl);
            if (!res.ok)
              return {
                error:
                  "Failed to download Google Sheet. Ensure it is visible to Anyone with the link.",
              };
            const text = await res.text();
            const result = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
            });
            parsedData = result.data as any[];
          } catch (e) {
            return { error: "Error fetching Google Sheet: " + String(e) };
          }
        } else {
          return { error: "Either file or url string must be provided" };
        }

        // Generate a preview ID
        const previewId = uuidv4();

        const normalized = parsedData.map((row) => {
          const rawGuid =
            row.guid || row.GUID || row.id || row["GUID клиента"] || "csv";
          return {
            guid: `${rawGuid}-${uuidv4().slice(0, 8)}`,
            gender:
              row.gender || row.Gender || row.Пол || row["Пол клиента"] || null,
            birthDate:
              row.birthDate || row.birth_date || row["Дата рождения"] || null,
            segment:
              row.segment ||
              row.Segment ||
              row.Сегмент ||
              row["Сегмент клиента"] ||
              null,
            description:
              row.description ||
              row.Description ||
              row.Описание ||
              row["Текст обращения"] ||
              row["Описание "] ||
              "",
            country: row.country || row.Country || row.Страна || null,
            city:
              row.city ||
              row.City ||
              row.Город ||
              row["Область"] ||
              row["Населённый пункт"] ||
              null,
            street: row.street || row.Street || row.Улица || null,
            house: row.house || row.House || row.Дом || null,
            status: row.status || row.Status || row.Статус || null,
          };
        });

        previewStore.set(previewId, normalized);

        return {
          success: true,
          previewId,
          data: normalized.slice(0, 50),
          totalRecords: normalized.length,
        };
      })
      .post(
        "/confirm",
        async ({ body, user }) => {
          if (!user || user.role !== "ADMIN")
            return { error: "Unauthorized. Admin required." };

          const { previewId } = body;
          if (!previewId) return { error: "Preview ID required" };

          const data = previewStore.get(previewId);
          if (!data) return { error: "Preview session expired or not found" };

          // Append to tickets database
          try {
            const toInsert = data.map((row) => ({
              companyId: user.companyId as number,
              guid: row.guid,
              gender: row.gender,
              birthDate: row.birthDate,
              segment: row.segment,
              description: row.description,
              country: row.country,
              city: row.city,
              street: row.street,
              house: row.house,
              status: row.status || "Новый",
            }));

            // For simplicity, handle chunking if there are many records
            const chunkSize = 500;
            for (let i = 0; i < toInsert.length; i += chunkSize) {
              const chunk = toInsert.slice(i, i + chunkSize);
              console.log(
                "Attempting to insert chunk starting with:",
                chunk[0],
              );
              try {
                const insertRes = await db
                  .insert(tickets)
                  .values(chunk)
                  .onConflictDoNothing({ target: tickets.guid });
                console.log("Insert response:", insertRes);
              } catch (dbErr) {
                console.error("DB INSERT ERROR:", dbErr);
              }
            }

            // Clean up memory
            previewStore.delete(previewId);

            // ── Enqueue for AI analysis ────────────────────────────────────
            try {
              const { normalizeTicket } = await import("../services/normalize");
              const { enqueueTickets } = await import("../services/queue");

              const unified = data.map((row: any) =>
                normalizeTicket("csv", row, user.companyId as number),
              );
              await enqueueTickets(unified);
              console.log(
                `[Data Loader] Enqueued ${unified.length} tickets for analysis`,
              );
            } catch (queueErr) {
              console.error(
                "[Data Loader] Failed to enqueue for analysis:",
                queueErr,
              );
              // Non-fatal — tickets are saved, analysis can run later via /process
            }

            return { success: true, count: data.length };
          } catch (e) {
            console.error("Error inserting data:", e);
            return { error: "Failed to save data. " + String(e) };
          }
        },
        {
          body: t.Object({
            previewId: t.String(),
          }),
        },
      ),
  );
