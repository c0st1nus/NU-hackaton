import { sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { cookie } from "@elysiajs/cookie";
import { readOnlyDb } from "../db";
import { config } from "../lib/config";

const SYSTEM_PROMPT = `Ты умный AI-Аналитик системы БДС (Служба Поддержки). 
У тебя есть доступ к базе данных PostgreSQL.

Схема таблиц:
- tickets(id, guid, gender, birth_date, segment, description, country, city, street, house, latitude, longitude, source, created_at)
- ticket_analysis(id, ticket_id, ticket_type, sentiment, priority, language, summary, recommendation, processed_at)
- managers(id, name, position, office, skills, current_load)
- business_units(id, office, address, latitude, longitude)
- assignments(id, ticket_id, analysis_id, manager_id, office_id, assigned_at, assignment_reason)

Типы: ticket_type = Жалоба|Смена данных|Консультация|Претензия|Неработоспособность приложения|Мошеннические действия|Спам
sentiment = Позитивный|Нейтральный|Негативный
segment = Mass|VIP|Priority
language = RU|KZ|ENG

ВАЖНЫЕ ПРАВИЛА JOIN & БЕЗОПАСНОСТЬ:
- tickets -> ticket_analysis: ON tickets.id = ticket_analysis.ticket_id
- tickets -> assignments: ON tickets.id = assignments.ticket_id
- assignments -> managers: ON assignments.manager_id = managers.id
- assignments -> business_units: ON assignments.office_id = business_units.id
- БЕЗОПАСНОСТЬ: Всегда добавляй условие WHERE company_id = {companyId} в каждый запрос, чтобы пользователь видел только данные своей компании. Не гадай ID, он будет подставлен в контекст.

ИНСТРУКЦИЯ К ОТВЕТУ:
Ты ОБЯЗАН ответить строго в формате JSON. Выбери один из двух вариантов:

Вариант 1 (Простой ответ/общение) — если вопрос не требует выгрузки данных из базы:
{
  "type": "text",
  "text": "Твой ответ пользователю"
}

Вариант 2 (Запрос к БД) — если пользователь просит показать статистику, топ, графики или данные:
{
  "type": "sql",
  "thought": "Краткое логическое объяснение, зачем я делаю этот запрос",
  "sql": "SELECT ...",
  "chartTitle": "Заголовок для графика (например: Топ 5 городов)"
}

В SQL всегда используй только существующие таблицы и поля. Никакого markdown, только чистый JSON.`;

const MUTATING_SQL_REGEX =
  /(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|GRANT|CREATE|REPLACE|EXECUTE|CALL|COPY)\s+/i;

export const starTaskRoutes = new Elysia({ prefix: "/star-task" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super-secret-key-change-me",
    })
  )
  .use(cookie())
  .derive(async ({ jwt, cookie: { auth_token } }) => {
    if (!auth_token?.value) return { user: null };
    const payload = await jwt.verify(auth_token.value as string);
    return { user: payload };
  })
  .post(
    "/chat",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = 401;
        return { type: "error", text: "Unauthorized" };
      }
      const companyId = user.companyId as number;
      const { messages } = body;
    if (!messages || messages.length === 0) {
      set.status = 400;
      return { message: "History is empty" };
    }

    const lastMessage = messages[messages.length - 1].content;

    // We send the whole conversation to the LLM
    const ollamaMessages = [
      { role: "system", content: SYSTEM_PROMPT.replace("{companyId}", companyId.toString()) },
      ...messages,
    ];

    let aiDecision: any = null;

    // 1. Initial LLM call to decide strategy (Text or SQL)
    try {
      const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.llm.apiKey}`,
        },
        body: JSON.stringify({
          model: config.llm.model,
          messages: ollamaMessages,
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error?.message || "LLM error");
      aiDecision = JSON.parse(data.choices[0].message.content);
    } catch (e: any) {
      console.error(e);
      set.status = 503;
      return {
        type: "error",
        text: `LLM недоступен или вернул ошибку: ${e.message}`,
      };
    }

    // 2. Handle simple text response
    if (aiDecision.type === "text") {
      return {
        type: "text",
        text: aiDecision.text,
      };
    }

    // 3. Handle SQL Generation Request
    if (aiDecision.type === "sql") {
      let sqlQuery = (aiDecision.sql || "").trim().replace(/```sql|```/g, "");
      let lastError = "";

      // 3 attempts to auto-recover from SQL errors
      for (let attempt = 0; attempt < 3; attempt++) {
        // Strict Validation
        if (!sqlQuery.toUpperCase().startsWith("SELECT")) {
          set.status = 400;
          return {
            type: "error",
            text: "Запрещенная операция. Допускается только SELECT.",
          };
        }
        if (MUTATING_SQL_REGEX.test(sqlQuery)) {
          set.status = 400;
          return {
            type: "error",
            text: "Обнаружена потенциальная SQL инъекция.",
          };
        }

        // Force company filter check
        if (!sqlQuery.toLowerCase().includes(`company_id = ${companyId}`)) {
          // Attempt to inject it if missing (basic heuristic)
          if (sqlQuery.toLowerCase().includes("where")) {
            sqlQuery = sqlQuery.replace(/where/i, `WHERE company_id = ${companyId} AND `);
          } else {
            sqlQuery += ` WHERE company_id = ${companyId}`;
          }
        }

        // Try Execute
        try {
          const result = await readOnlyDb.execute(sql.raw(sqlQuery));
          const rows = result as unknown as Record<string, unknown>[];
          const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

          // LLM Analysis of the result
          let analyticalText = "Вот данные по вашему запросу:";
          if (rows.length > 0) {
            try {
              const analysisRes = await fetch(
                `${config.llm.baseUrl}/chat/completions`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${config.llm.apiKey}`,
                  },
                  body: JSON.stringify({
                    model: config.llm.model,
                    messages: [
                      {
                        role: "system",
                        content:
                          "Ты умный бизнес-аналитик. Тебе дали вопрос пользователя и результат SQL-запроса в виде JSON. Твоя задача: кратко (в 1-3 предложениях) проанализировать эти данные и дать чёткий вывод или ответ на вопрос пользователя. Не пиши технические детали про SQL-запросы или как ты получил данные, просто дай аналитический ответ основанный на данных.",
                      },
                      {
                        role: "user",
                        content: `Вопрос пользователя: ${lastMessage}\nДанные (JSON, ограничены): ${JSON.stringify(rows).slice(0, 3000)}`,
                      },
                    ],
                    temperature: 0.3,
                  }),
                  signal: AbortSignal.timeout(15000),
                },
              );
              const analysisData = (await analysisRes.json()) as any;
              if (
                analysisRes.ok &&
                analysisData.choices?.[0]?.message?.content
              ) {
                analyticalText = analysisData.choices[0].message.content;
              }
            } catch (err) {
              console.error("Analytics LLM error:", err);
            }
          } else {
            analyticalText =
              "К сожалению, по вашему запросу данных не найдено.";
          }

          // Determine chart type from the question
          const q = lastMessage.toLowerCase();
          let chartType = "bar";
          if (
            q.includes("доля") ||
            q.includes("процент") ||
            q.includes("распределени")
          )
            chartType = "pie";
          if (
            q.includes("динамик") ||
            q.includes("по дням") ||
            q.includes("по месяц")
          )
            chartType = "line";

          return {
            type: "sql_result",
            text: analyticalText,
            data: {
              sql: sqlQuery,
              columns,
              rows: rows.map((r) => columns.map((c) => r[c])),
              chartType,
              chartTitle: aiDecision.chartTitle || lastMessage,
            },
          };
        } catch (e: unknown) {
          lastError = (e as Error).message || String(e);

          if (attempt < 2) {
            console.log(
              `[Star Task] JSON Auto-recovery try ${attempt + 1}: ${lastError}`,
            );
            // Feed the error back to Ollama to fix the SQL
            try {
              const fixRes = await fetch(
                `${config.llm.baseUrl}/chat/completions`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${config.llm.apiKey}`,
                  },
                  body: JSON.stringify({
                    model: config.llm.model,
                    messages: [
                      { role: "system", content: SYSTEM_PROMPT },
                      { role: "user", content: lastMessage },
                      {
                        role: "assistant",
                        content: JSON.stringify(aiDecision),
                      },
                      {
                        role: "user",
                        content: `Твой SQL вернул ошибку PostgreSQL:\n${lastError}\n\nИсправь ошибку и верни новый JSON с полем "sql".`,
                      },
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.1,
                  }),
                },
              );
              const fixData = (await fixRes.json()) as any;
              if (!fixRes.ok)
                throw new Error(fixData.error?.message || "LLM error");
              const fixedDecision = JSON.parse(
                fixData.choices[0].message.content,
              );
              sqlQuery = fixedDecision.sql || "";
            } catch (err) {
              console.error(err);
              break; // If recovery fails, break out and return error
            }
          }
        }
      }

      set.status = 400;
      return {
        type: "error",
        text: `Не удалось составить корректный SQL запрос после 3 попыток.\nОшибка БД: ${lastError}`,
      };
    }

    set.status = 400;
    return { type: "error", text: "Неизвестный формат ответа от ИИ." };
  },
  {
    body: t.Object({
      messages: t.Array(
        t.Object({
          role: t.String(),
          content: t.String(),
        }),
      ),
    }),
  },
);
