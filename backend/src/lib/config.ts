export const config = {
  port: Number(process.env.PORT) || 3001,
  db: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: Number(process.env.MINIO_PORT) || 9000,
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucket: process.env.MINIO_BUCKET || "fire-attachments",
  },
  llm: {
    baseUrl: process.env.OPENAI_BASE_URL || "http://localhost:11434/v1",
    apiKey: process.env.OPENAI_API_KEY || "ollama",
    model: process.env.OPENAI_MODEL || "mistral",
  },
};
