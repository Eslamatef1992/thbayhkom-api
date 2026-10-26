import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { config } from '../config';

/** Ensure the upload directory exists. */
export const uploadDir = path.resolve(config.upload.dir);
fs.mkdirSync(uploadDir, { recursive: true });

// SVG is allowed (country flags in production are SVG); /uploads is served with a CSP sandbox
// (see app.ts) so scripts inside an SVG never run.
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || mimeExt(file.mimetype);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

function mimeExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    case 'image/gif': return '.gif';
    case 'image/svg+xml': return '.svg';
    default: return '';
  }
}

export const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (jpeg, png, webp, gif, svg) are allowed'));
  },
});

/** Build the public URL for a stored filename, using configured base or the request host. */
export function fileUrl(req: { protocol: string; get: (h: string) => string | undefined }, filename: string): string {
  const base = config.upload.publicBaseUrl || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/uploads/${filename}`;
}

/** Extract a safe filename from a full URL or bare filename; blocks path traversal. */
export function filenameFromUrl(input: string): string | null {
  if (!input) return null;
  let name = input;
  try {
    if (/^https?:\/\//i.test(input)) name = new URL(input).pathname;
  } catch {
    return null;
  }
  name = name.split('/').pop() || '';
  // Reject anything with path separators or traversal.
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return null;
  return name;
}

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

/** Video uploads (banner videos). Separate size limit: UPLOAD_MAX_VIDEO_MB (default 100). */
export const uploadVideo = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: config.upload.maxVideoSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only video files (mp4, webm, ogg, mov) are allowed'));
  },
});
