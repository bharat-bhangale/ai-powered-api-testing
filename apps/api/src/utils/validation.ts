import { z } from 'zod';

// ===== Auth Validation Schemas =====

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  name: z.string().min(1, 'Name is required').trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ===== Collection Validation Schemas =====

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  description: z.string().max(500).optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  auth: z
    .object({
      type: z.enum(['none', 'apikey', 'bearer', 'basic']),
      config: z.record(z.unknown()).default({}),
    })
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const addFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100).trim(),
  parentFolderId: z.string().optional(),
});

export const renameFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
});

// ===== Request Validation Schemas =====

export const createRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  collectionId: z.string().min(1, 'Collection ID is required'),
  folderId: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  url: z.string().default(''),
  headers: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional().default(''),
        enabled: z.boolean().optional().default(true),
      }),
    )
    .optional(),
  params: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional().default(''),
        enabled: z.boolean().optional().default(true),
      }),
    )
    .optional(),
  body: z
    .object({
      mode: z.string().optional().default('none'),
      content: z.string().optional().default(''),
      contentType: z.string().optional().default(''),
    })
    .optional(),
  auth: z
    .object({
      type: z.enum(['none', 'apikey', 'bearer', 'basic']).optional().default('none'),
      config: z.record(z.unknown()).default({}),
    })
    .optional(),
});

export const updateRequestSchema = createRequestSchema
  .omit({ collectionId: true })
  .partial()
  .extend({
    sortOrder: z.number().int().min(0).optional(),
  });
