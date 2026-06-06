import type { Request, Response } from 'express';
import { parsePostmanCollection } from './parsers/postman.parser';
import { dbProvider } from '../../data/database-provider';
import crypto from 'crypto';
import type { HttpMethod, RequestBody, AuthConfig } from '@atx/shared/src/types/request.types';

/** POST /api/import/postman — Import a Postman Collection v2.1 JSON */
export async function importPostman(req: Request, res: Response): Promise<void> {
  try {
    const { collection: postmanJson } = req.body;

    if (!postmanJson || !postmanJson.info) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_FORMAT', message: 'Invalid Postman collection format. Expected v2.1 JSON with "info" field.' },
      });
      return;
    }

    const parsed = parsePostmanCollection(postmanJson);

    // Create collection
    const collection = await dbProvider.collections.create({
      id: crypto.randomUUID(),
      name: parsed.name,
      description: parsed.description,
      userId: req.userId as string,
    });

    // Create folders
    const folderMap: Record<string, string> = {};
    for (let i = 0; i < parsed.folders.length; i++) {
      const f = parsed.folders[i]!;
      const folder = await dbProvider.folders.create({
        id: crypto.randomUUID(),
        collectionId: collection.id,
        name: f.name,
        parentFolderId: undefined, // Flat import
        sortOrder: i,
      });
      folderMap[f.name] = folder.id;
    }

    // Create requests
    const requests = [];
    for (let i = 0; i < parsed.requests.length; i++) {
      const r = parsed.requests[i]!;
      const request = await dbProvider.requests.create({
        id: crypto.randomUUID(),
        name: r.name,
        collectionId: collection.id,
        folderId: r.folderPath ? folderMap[r.folderPath.split('/').pop()!] || undefined : undefined,
        userId: req.userId as string,
        method: r.method as HttpMethod,
        url: r.url,
        headers: r.headers.map(h => ({ ...h, id: crypto.randomUUID() })),
        params: r.params.map(p => ({ ...p, id: crypto.randomUUID() })),
        body: r.body as unknown as RequestBody,
        auth: r.auth as unknown as AuthConfig,
        sortOrder: i,
      });
      requests.push(request);
    }

    res.status(201).json({
      success: true,
      data: {
        collection: { ...collection, _id: collection.id, folders: Object.values(folderMap).map((id, index) => ({ _id: id, name: parsed.folders[index]?.name })) },
        requestCount: requests.length,
        folderCount: parsed.folders.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed';
    res.status(500).json({
      success: false,
      error: { code: 'IMPORT_ERROR', message },
    });
  }
}
