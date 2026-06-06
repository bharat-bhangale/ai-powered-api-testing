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

import { dbProvider } from '../../data/database-provider';

// ===== Constants =====

/** Stable synthetic user ID used as the owner key for all desktop data. */
export const LOCAL_USER_ID = 'local-user' as const;

/** Local user profile shape returned to the frontend. */
export interface LocalUserProfile {
  _id: string;
  email: string;
  name: string;
  avatar: string | undefined;
  preferences: {
    theme: string;
    editorFontSize: number;
  };
}

// ===== Service =====

/**
 * Returns the synthetic local user profile.
 * Fetches the bootstrapped local user from the SQLite database using the provider boundary.
 * Called by GET /api/auth/me in desktop mode.
 */
export async function getLocalUser(): Promise<LocalUserProfile> {
  const userRecord = await dbProvider.users.getById(LOCAL_USER_ID);
  
  if (!userRecord) {
    throw new Error('Local user not bootstrapped in database');
  }

  return {
    _id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    avatar: userRecord.avatar ?? undefined,
    preferences: {
      theme: userRecord.theme,
      editorFontSize: userRecord.editorFontSize,
    },
  };
}
