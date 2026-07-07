import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from '../../utils/validation';
import { isDesktopMode } from '../../config/runtime';
import { getLocalUser } from './desktop-auth.service';

const authService = new AuthService();

/** Cookie config for refresh token. */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' },
      });
      return;
    }

    const { email, name, password } = parsed.data;

    const { user, accessToken, refreshToken } = await authService.register(
      email,
      name,
      password,
    );

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.status(201).json({
      success: true,
      data: { user, accessToken },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({
      success: false,
      error: { code: 'AUTH_ERROR', message },
    });
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' },
      });
      return;
    }

    const { email, password } = parsed.data;

    const { user, accessToken, refreshToken } = await authService.login(
      email,
      password,
    );

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({
      success: true,
      data: { user, accessToken },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({
      success: false,
      error: { code: 'AUTH_ERROR', message },
    });
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) {
      res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'No refresh token provided' },
      });
      return;
    }

    const { accessToken, refreshToken } =
      await authService.refreshTokens(oldRefreshToken);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_ERROR', message },
    });
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
}

/**
 * GET /api/auth/me
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  // Desktop mode: return the synthetic local user without hitting the database.
  if (isDesktopMode) {
    const localUser = await getLocalUser();
    res.json({
      success: true,
      data: { user: localUser },
    });
    return;
  }

  // Web mode: look up the real user in MongoDB.
  try {
    const userId = (req as Request & { userId: string }).userId;
    const user = await authService.getMe(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get user';
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message },
    });
  }
}
