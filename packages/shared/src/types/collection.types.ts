import type { HttpMethod, KeyValuePair, RequestBody, AuthConfig } from './request.types';

/**
 * Folder within a collection.
 */
export interface CollectionFolder {
  id: string;
  name: string;
  parentFolderId?: string;
  sortOrder: number;
}

/**
 * Collection — groups saved requests with optional folders.
 */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  userId: string;
  folders: CollectionFolder[];
  auth?: AuthConfig;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Saved request within a collection.
 */
export interface SavedRequest {
  id: string;
  name: string;
  collectionId: string;
  folderId?: string;
  userId: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload to create a new collection.
 */
export interface CreateCollectionPayload {
  name: string;
  description?: string;
}

/**
 * Payload to create a new saved request.
 */
export interface CreateRequestPayload {
  name: string;
  collectionId: string;
  folderId?: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
}
