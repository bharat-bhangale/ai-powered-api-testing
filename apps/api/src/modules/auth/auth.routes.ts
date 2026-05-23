import { Router } from 'express';
import { register, login, refresh, logout, getMe } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

/** POST /api/auth/register — Create a new user account */
router.post('/register', register);

/** POST /api/auth/login — Login with email + password */
router.post('/login', login);

/** POST /api/auth/refresh — Refresh access token using cookie */
router.post('/refresh', refresh);

/** POST /api/auth/logout — Clear refresh token cookie */
router.post('/logout', logout);

/** GET /api/auth/me — Get current user (protected) */
router.get('/me', authenticate, getMe);

export default router;
