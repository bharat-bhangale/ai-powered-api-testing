/**
 * Desktop Authentication Service.
 *
 * Provides a static local user identity for desktop mode.
 * No database, no tokens, no network calls.
 *
 * The local user is a well-known singleton that represents the
 * desktop app operator. It is used by:
 *   - authenticate middleware (injects LOCAL_USER_ID into req.userId)
 *   - GET /api/auth/me (returns LOCAL_USER profile)
 *   - authStore.checkAuth() on the frontend (hydrates with LOCAL_USER)
 */

// ===== Constants =====

/** Stable synthetic user ID used as the owner key for all desktop data. */
export const LOCAL_USER_ID = 'local-user' as const;

/** Local user profile shape returned to the frontend. */
export interface LocalUserProfile {
  _id: string;
  email: string;
  name: string;
  avatar: undefined;
  preferences: {
    theme: 'dark';
    editorFontSize: number;
  };
}

// ===== Service =====

/**
 * Returns the synthetic local user profile.
 * Called by GET /api/auth/me in desktop mode.
 */
export function getLocalUser(): LocalUserProfile {
  return {
    _id: LOCAL_USER_ID,
    email: 'local@atx.desktop',
    name: 'Local User',
    avatar: undefined,
    preferences: {
      theme: 'dark',
      editorFontSize: 14,
    },
  };
}
