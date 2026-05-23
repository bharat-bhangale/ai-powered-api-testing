import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Auth service unit tests.
 * Tests register, login, refreshTokens, getMe logic.
 * Uses mocked Mongoose models.
 */

// ===== Mocks =====

const mockUserSave = vi.fn();
const mockComparePassword = vi.fn();

vi.mock('../../../models/User.model', () => {
  const mockUser = vi.fn().mockImplementation((data) => ({
    ...data,
    _id: 'user-123',
    save: mockUserSave,
    toJSON: () => ({ ...data, _id: 'user-123' }),
    comparePassword: mockComparePassword,
  }));

  return {
    User: Object.assign(mockUser, {
      findOne: vi.fn(),
      findById: vi.fn(),
    }),
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-token'),
    verify: vi.fn().mockReturnValue({ userId: 'user-123' }),
  },
}));

import { AuthService } from '../auth.service';
import { User } from '../../../models/User.model';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
    mockUserSave.mockResolvedValue(undefined);
  });

  // ===== Register =====

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await authService.register('test@example.com', 'Test User', 'password123');

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(mockUserSave).toHaveBeenCalled();
    });

    it('should reject if email already exists', async () => {
      (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'existing' });

      await expect(
        authService.register('test@example.com', 'Test', 'password123'),
      ).rejects.toThrow('Email already registered');
    });

    it('should reject password shorter than 8 characters', async () => {
      (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        authService.register('test@example.com', 'Test', 'short'),
      ).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  // ===== Login =====

  describe('login', () => {
    it('should return user and tokens on valid credentials', async () => {
      mockComparePassword.mockResolvedValue(true);
      (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: 'user-123',
        email: 'test@example.com',
        comparePassword: mockComparePassword,
        toJSON: () => ({ _id: 'user-123', email: 'test@example.com' }),
      });

      const result = await authService.login('test@example.com', 'password123');

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
    });

    it('should throw on invalid email', async () => {
      (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        authService.login('wrong@example.com', 'password123'),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw on wrong password', async () => {
      mockComparePassword.mockResolvedValue(false);
      (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: 'user-123',
        comparePassword: mockComparePassword,
      });

      await expect(
        authService.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  // ===== Token Refresh =====

  describe('refreshTokens', () => {
    it('should return new token pair for valid refresh token', async () => {
      (User.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: 'user-123',
      });

      const result = await authService.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('should throw if user not found during refresh', async () => {
      (User.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        authService.refreshTokens('valid-token'),
      ).rejects.toThrow('User not found');
    });
  });

  // ===== getMe =====

  describe('getMe', () => {
    it('should return user by ID', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com' };
      (User.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await authService.getMe('user-123');

      expect(result).toEqual(mockUser);
      expect(User.findById).toHaveBeenCalledWith('user-123');
    });

    it('should return null for non-existent user', async () => {
      (User.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await authService.getMe('non-existent');

      expect(result).toBeNull();
    });
  });
});
