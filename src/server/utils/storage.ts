import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises'; import path from 'path';
import { ApiError } from './helpers';

/**
 * File storage. Uses S3 or Cloudflare R2 when S3_BUCKET is set (R2: also set S3_ENDPOINT).
 * Without it, files go to ./.uploads on disk, which is fine on your own machine but does not survive on serverless hosting.
 */
const bucket = () => process.env.S3_BUCKET;
export const storageMode = (): 's3' | 'local' | 'none' => (bucket() ? 's3' : process.env.VERCEL ? 'none' : 'local');
let s3: S3Client | null = null;
const client = () => (s3 ??= new S3Client({ region: process.env.S3_REGION || 'auto', endpoint: process.env.S3_ENDPOINT || undefined, forcePathStyle: !!process.env.S3_ENDPOINT,
  credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' } : undefined }));
const localPath = (key: string) => { const root = path.resolve(process.env.UPLOAD_DIR || '.uploads'); const p = path.resolve(root, key); if (!p.startsWith(root + path.sep)) throw new ApiError(400, 'Bad file key'); return p; };
const need = () => { if (storageMode() === 'none') throw new ApiError(503, 'File storage is not set up on this server yet. Add S3_BUCKET and its keys (AWS S3 or Cloudflare R2) to the server settings.'); };

export async function putFile(key: string, body: Buffer, contentType: string) {
  need();
  if (storageMode() === 's3') { await client().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType })); return; }
  const p = localPath(key); await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, body);
}
/** S3/R2: a link that works for five minutes. Local disk: the bytes themselves. */
export async function getFile(key: string, filename: string): Promise<{ url: string } | { buffer: Buffer }> {
  need();
  if (storageMode() === 's3') return { url: await getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, '')}"` }), { expiresIn: 300 }) };
  return { buffer: await fs.readFile(localPath(key)) };
}
export async function deleteFile(key: string) {
  if (storageMode() === 's3') { await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })); return; }
  if (storageMode() === 'local') await fs.rm(localPath(key), { force: true });
}
