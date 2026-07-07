import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { isDesktopMode } from '../config/runtime';
import { LOCAL_USER_ID } from '../modules/auth/desktop-auth.service';

/**
 * Extend Express Request with userId (set by authenticate middleware).
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Authentication middleware.
 *
 * Desktop mode:
 *   - Skips JWT verification entirely.
 *   - Injects LOCAL_USER_ID ('local-user') as req.userId.
 *   - Every protected route proceeds without credentials.
 *
 * Web mode (unchanged):
 *   - Reads the Bearer token from the Authorization header.
 *   - Verifies with ACCESS_TOKEN_SECRET.
 *   - Returns 401 on missing, malformed, or invalid tokens.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // ===== Desktop mode: inject synthetic local user, skip JWT =====
  if (isDesktopMode) {
    req.userId = LOCAL_USER_ID;
    next();
    return;
  }

  // ===== Web mode: standard JWT verification =====

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is required',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is malformed',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    const code = error instanceof jwt.TokenExpiredError ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
    const message = error instanceof jwt.TokenExpiredError
      ? 'Access token has expired'
      : 'Invalid access token';

    res.status(401).json({
      success: false,
      error: { code, message },
    });
  }
}
