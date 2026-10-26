import { Request, Response, NextFunction, RequestHandler } from 'express';

/** Wrap async route handlers so thrown errors reach the global error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export function getPage(req: Request): number {
  const p = parseInt(String(req.query.page || '1'), 10);
  return Number.isFinite(p) && p > 0 ? p : 1;
}

export function paginate(page: number, pageSize: number) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}
