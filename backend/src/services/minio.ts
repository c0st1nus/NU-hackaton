import { Client } from "minio";
import { config } from "../lib/config";

export const minioClient = new Client({
  endPoint: config.minio.endPoint,
  port: config.minio.port,
  useSSL: false,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

// Create bucket on startup if it doesn't exist
export async function ensureBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(config.minio.bucket);
    if (!exists) {
      await minioClient.makeBucket(config.minio.bucket, "us-east-1");
      console.log(`✅ MinIO bucket "${config.minio.bucket}" created`);
    } else {
      console.log(`✅ MinIO bucket "${config.minio.bucket}" already exists`);
    }
  } catch (err) {
    console.error("MinIO bucket check/create failed:", err);
  }
}

// Upload a ticket attachment and return its public URL
export async function uploadAttachment(
  ticketId: number,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const objectName = `tickets/${ticketId}/${Date.now()}-${filename}`;
  await minioClient.putObject(
    config.minio.bucket,
    objectName,
    buffer,
    buffer.length,
    {
      "Content-Type": contentType,
    },
  );
  return `http://${config.minio.endPoint}:${config.minio.port}/${config.minio.bucket}/${objectName}`;
}
