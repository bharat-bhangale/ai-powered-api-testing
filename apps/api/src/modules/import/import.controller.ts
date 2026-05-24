import type { Request, Response } from 'express';
import { parsePostmanCollection } from './parsers/postman.parser';
import { Collection } from '../../models/Collection.model';
import { SavedRequest } from '../../models/Request.model';

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

    // Create collection with folders
    const collection = await Collection.create({
      name: parsed.name,
      description: parsed.description,
      userId: req.userId,
      folders: parsed.folders.map((f, i) => ({
        name: f.name,
        parentFolderId: null, // Flat import — nesting handled by folder names
        sortOrder: i,
      })),
    });

    // Build folder ID mapping (name → _id)
    const folderMap: Record<string, string> = {};
    collection.folders.forEach((f) => {
      folderMap[f.name] = f._id.toString();
    });

    // Create requests
    const requests = parsed.requests.map((r, i) => ({
      name: r.name,
      collectionId: collection._id,
      folderId: r.folderPath ? folderMap[r.folderPath.split('/').pop()!] || null : null,
      userId: req.userId,
      method: r.method,
      url: r.url,
      headers: r.headers,
      params: r.params,
      body: r.body,
      auth: r.auth,
      sortOrder: i,
    }));

    if (requests.length > 0) {
      await SavedRequest.insertMany(requests);
    }

    res.status(201).json({
      success: true,
      data: {
        collection: collection.toObject(),
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
