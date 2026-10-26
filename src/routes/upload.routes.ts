import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../utils/http';
import { authRequired, AuthedRequest } from '../middleware/auth';
import { upload, uploadVideo, uploadDir, fileUrl, filenameFromUrl } from '../services/upload';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

/**
 * Image upload endpoints. Any authenticated user (customer or admin) may upload.
 * Files are stored on disk in UPLOAD_DIR and served statically at /uploads/<filename>.
 * Responses use the mobile envelope shape { status, code, message, ... } so both
 * the Flutter app and the admin dashboard can consume them.
 */

// Single image → { url }
router.post(
  '/single',
  authRequired,
  upload.single('file'),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.file) {
      return res.status(200).json({ status: false, code: 400, message: 'No file uploaded (field name must be "file")' });
    }
    const url = fileUrl(req, req.file.filename);
    res.status(200).json({ status: true, code: 200, message: 'Uploaded', url, filename: req.file.filename });
  })
);

// Video (admin only, used for video banners) → { url }
router.post(
  '/video',
  adminAuth,
  uploadVideo.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(200).json({ status: false, code: 400, message: 'No file uploaded (field name must be "file")' });
    }
    const url = fileUrl(req, req.file.filename);
    res.status(200).json({ status: true, code: 200, message: 'Uploaded', url, filename: req.file.filename });
  })
);

// Multiple images → { urls: [...] }
router.post(
  '/multiple',
  authRequired,
  upload.array('files', 10),
  asyncHandler(async (req: AuthedRequest, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      return res.status(200).json({ status: false, code: 400, message: 'No files uploaded (field name must be "files")' });
    }
    const items = files.map((f) => ({ url: fileUrl(req, f.filename), filename: f.filename }));
    res.status(200).json({ status: true, code: 200, message: 'Uploaded', urls: items.map((i) => i.url), files: items });
  })
);

// Delete by URL or filename. Accepts { url } or { filename } in the body, or ?url= / ?filename=.
async function handleDelete(req: AuthedRequest, res: any) {
  const input = (req.body?.url || req.body?.filename || req.query.url || req.query.filename) as string;
  const filename = filenameFromUrl(input);
  if (!filename) {
    return res.status(200).json({ status: false, code: 400, message: 'A valid url or filename is required' });
  }
  const target = path.join(uploadDir, filename);
  if (!fs.existsSync(target)) {
    return res.status(200).json({ status: false, code: 404, message: 'File not found' });
  }
  fs.unlinkSync(target);
  res.status(200).json({ status: true, code: 200, message: 'Deleted', filename });
}

router.post('/delete', authRequired, asyncHandler(handleDelete));
router.delete('/delete', authRequired, asyncHandler(handleDelete));

export default router;
