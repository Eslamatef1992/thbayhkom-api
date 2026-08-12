import { Request, Response, NextFunction } from 'express';

/** Global error handler. Keeps mobile envelope for /api and REST shape elsewhere. */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  // eslint-disable-next-line no-console
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err?.message || err);

  const isAdmin = req.originalUrl.includes('/admin');
  if (isAdmin) {
    res.status(err.httpStatus || 500).json({ success: false, message: err.message || 'Internal server error' });
    return;
  }
  // Mobile contract: always HTTP 200 with envelope.
  res.status(200).json({
    status: false,
    code: err.code || 500,
    message: err.message || 'Internal server error',
  });
}

export function notFound(req: Request, res: Response): void {
  const isAdmin = req.originalUrl.includes('/admin');
  if (isAdmin) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.status(200).json({ status: false, code: 404, message: 'Endpoint not found' });
}
