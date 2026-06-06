import { dbProvider } from '../../data/database-provider';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class BackupsService {
  async exportBackup(userId: string, targetPath?: string): Promise<any> {
    const collections = await dbProvider.collections.listByUser(userId);
    const environments = await dbProvider.environments.listByUser(userId);
    const settings = await dbProvider.settings.getAll();

    const manifest = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      collections: await Promise.all(
        collections.map(async (c) => {
          const folders = await dbProvider.folders.listByCollection(c.id);
          const requests = await dbProvider.requests.listByCollection({ collectionId: c.id, userId });
          return { ...c, folders, requests };
        })
      ),
      environments,
      settings,
    };

    if (targetPath) {
      const backupPath = path.resolve(targetPath);
      await fs.promises.writeFile(backupPath, JSON.stringify(manifest, null, 2), 'utf8');
      
      // Log backup record
      await dbProvider.backups.create({
        id: crypto.randomUUID(),
        userId,
        filePath: backupPath,
        kind: 'manual',
        status: 'completed'
      });

      return { path: backupPath };
    }

    return manifest;
  }

  async restoreBackup(userId: string, manifest: any): Promise<void> {
    // Basic validation
    if (!manifest || manifest.version !== '1.0') {
      throw new Error('Invalid backup manifest');
    }

    // 1. Create a pre-restore backup (safeguard)
    const safetyPath = path.join(process.cwd(), `pre-restore-${Date.now()}.json`);
    await this.exportBackup(userId, safetyPath);

    // 2. Perform restore
    try {
      // Clear current data for this user
      const collections = await dbProvider.collections.listByUser(userId);
      for (const c of collections) {
        await dbProvider.collections.delete({ id: c.id, userId });
      }
      
      const environments = await dbProvider.environments.listByUser(userId);
      for (const env of environments) {
        await dbProvider.environments.delete({ id: env.id, userId });
      }

      // We don't delete settings to prevent losing master keys, but we update them
      
      // Restore environments
      for (const env of manifest.environments || []) {
        await dbProvider.environments.create({
          id: env.id,
          userId,
          name: env.name,
          variables: env.variables,
        });
      }

      // Restore collections
      for (const col of manifest.collections || []) {
        await dbProvider.collections.create({
          id: col.id,
          userId,
          name: col.name,
          description: col.description,
          auth: col.auth,
          sortOrder: col.sortOrder,
        });

        for (const folder of col.folders || []) {
          await dbProvider.folders.create({
            id: folder.id,
            collectionId: folder.collectionId,
            name: folder.name,
            parentFolderId: folder.parentFolderId,
            sortOrder: folder.sortOrder,
          });
        }

        for (const req of col.requests || []) {
          await dbProvider.requests.create({
            id: req.id,
            name: req.name,
            collectionId: req.collectionId,
            folderId: req.folderId,
            userId,
            method: req.method,
            url: req.url,
            headers: req.headers,
            params: req.params,
            body: req.body,
            auth: req.auth,
            sortOrder: req.sortOrder,
          });
        }
      }

      // Restore settings
      if (manifest.settings) {
        for (const [key, value] of Object.entries(manifest.settings)) {
          await dbProvider.settings.set({ key, value: String(value) });
        }
      }
    } catch (err) {
      // If restore fails, we should technically restore the safety backup. 
      // For now, throw the error so the user knows it failed.
      throw new Error(`Restore failed: ${(err as Error).message}. Safety backup created at ${safetyPath}`);
    }
  }
}
