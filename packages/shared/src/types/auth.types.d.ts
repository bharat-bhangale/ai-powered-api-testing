/**
 * User preferences for the application.
 */
export interface UserPreferences {
    theme: 'dark' | 'light' | 'system';
    editorFontSize: number;
    editorWordWrap: boolean;
}
/**
 * Public user profile — returned from API (never includes password).
 */
export interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    preferences: UserPreferences;
    createdAt: string;
    updatedAt: string;
}
/**
 * Auth token pair — access token is returned in response body,
 * refresh token is set as HTTP-only cookie.
 */
export interface AuthTokens {
    accessToken: string;
    expiresIn: number;
}
/**
 * Login request payload.
 */
export interface LoginPayload {
    email: string;
    password: string;
}
/**
 * Registration request payload.
 */
export interface RegisterPayload {
    email: string;
    name: string;
    password: string;
}
//# sourceMappingURL=auth.types.d.ts.map