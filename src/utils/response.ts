import { Response } from 'express';

export interface Envelope {
  status: boolean;
  code: number;
  message: string;
  [key: string]: any;
}

/**
 * All responses are HTTP 200 with a JSON envelope. Business result lives in
 * `status`/`code` (see backend/docs/01_REQUIREMENTS.md §3).
 */
export function ok(res: Response, payload: Record<string, any> = {}, message = 'success', code = 200): void {
  res.status(200).json({ status: true, code, message, ...payload });
}

export function fail(res: Response, code = 400, message = 'error', payload: Record<string, any> = {}): void {
  res.status(200).json({ status: false, code, message, ...payload });
}

/** For admin dashboard endpoints we use conventional REST JSON + real HTTP codes. */
export function adminOk(res: Response, data: any = null, meta?: Record<string, any>): void {
  res.status(200).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function adminFail(res: Response, httpStatus = 400, message = 'error'): void {
  res.status(httpStatus).json({ success: false, message });
}
