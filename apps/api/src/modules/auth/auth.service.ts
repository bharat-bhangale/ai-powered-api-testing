import jwt from 'jsonwebtoken';
import { User, type IUser } from '../../models/User.model';
import { env } from '../../config/env';

/**
 * Authentication service — handles register, login, token refresh, and user retrieval.
 * Business logic only — no req/res access.
 */
export class AuthService {
  /**
   * Register a new user.
   * Checks for existing email, validates password length, creates user, returns tokens.
   */
  async register(
    email: string,
    name: string,
    password: string,
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error('Email already registered');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const user = new User({ email, name, passwordHash: password });
    await user.save();

    const tokens = this.generateTokens(user._id.toString());
    return { user, ...tokens };
  }

  /**
   * Login with email and password.
   * Returns user + JWT tokens.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const tokens = this.generateTokens(user._id.toString());
    return { user, ...tokens };
  }

  /**
   * Refresh tokens using a valid refresh token.
   * Verifies the JWT and issues a new token pair.
   */
  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as { userId: string };
    } catch {
      throw new Error('Invalid refresh token');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.generateTokens(user._id.toString());
  }

  /**
   * Get user by ID (for /me endpoint).
   */
  async getMe(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  /**
   * Generate access + refresh token pair.
   * Access: 15 min, Refresh: 7 days.
   */
  private generateTokens(userId: string): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = jwt.sign({ userId }, env.ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
    });
    const refreshToken = jwt.sign({ userId }, env.REFRESH_TOKEN_SECRET, {
      expiresIn: '7d',
    });
    return { accessToken, refreshToken };
  }
}
