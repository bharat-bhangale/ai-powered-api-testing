/**
 * @atx/shared — Barrel export for all shared types.
 *
 * Import from this package in both frontend and backend:
 * import type { HttpMethod, ApiResponse, RequestConfig } from '@atx/shared';
 */

// Request types
export type {
  HttpMethod,
  KeyValuePair,
  RequestBody,
  AuthConfig,
  RequestConfig,
} from './types/request.types';

// Response types
export type {
  ResponseTiming,
  ResponseCookie,
  ResponseData,
  ExecutionResult,
} from './types/response.types';

// Auth types
export type {
  UserPreferences,
  UserProfile,
  AuthTokens,
  LoginPayload,
  RegisterPayload,
} from './types/auth.types';

// Collection types
export type {
  CollectionFolder,
  Collection,
  SavedRequest,
  CreateCollectionPayload,
  CreateRequestPayload,
} from './types/collection.types';

// Environment types
export type {
  VariableType,
  EnvironmentVariable,
  Environment,
  CreateEnvironmentPayload,
  UpdateEnvironmentPayload,
} from './types/environment.types';

// AI types
export type {
  TestCategory,
  GeneratedTest,
  TestSuite,
  ConfidenceLevel,
  FixPriority,
  DebugSuggestion,
  DebugAnalysis,
  ChatMessage,
  AIUsage,
} from './types/ai.types';

// API types
export type {
  ApiSuccessResponse,
  ApiErrorDetail,
  ApiErrorResponse,
  ApiResponse,
  ApiErrorCode,
  PaginatedResponse,
} from './types/api.types';

export { API_ERROR_CODES } from './types/api.types';
