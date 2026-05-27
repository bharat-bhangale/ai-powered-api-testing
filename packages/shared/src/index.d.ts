/**
 * @atx/shared — Barrel export for all shared types.
 *
 * Import from this package in both frontend and backend:
 * import type { HttpMethod, ApiResponse, RequestConfig } from '@atx/shared';
 */
export type { HttpMethod, KeyValuePair, RequestBody, AuthConfig, RequestConfig, } from './types/request.types';
export type { ResponseTiming, ResponseCookie, ResponseData, ExecutionResult, } from './types/response.types';
export type { UserPreferences, UserProfile, AuthTokens, LoginPayload, RegisterPayload, } from './types/auth.types';
export type { CollectionFolder, Collection, SavedRequest, CreateCollectionPayload, CreateRequestPayload, } from './types/collection.types';
export type { VariableType, EnvironmentVariable, Environment, CreateEnvironmentPayload, UpdateEnvironmentPayload, } from './types/environment.types';
export type { TestCategory, GeneratedTest, TestSuite, ConfidenceLevel, FixPriority, DebugSuggestion, DebugAnalysis, ChatMessage, AIUsage, } from './types/ai.types';
export type { ApiSuccessResponse, ApiErrorDetail, ApiErrorResponse, ApiResponse, ApiErrorCode, PaginatedResponse, } from './types/api.types';
export { API_ERROR_CODES } from './types/api.types';
//# sourceMappingURL=index.d.ts.map