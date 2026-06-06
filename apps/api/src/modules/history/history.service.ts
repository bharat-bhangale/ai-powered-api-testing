import { dbProvider } from '../../data/database-provider';
import crypto from 'crypto';

/**
 * History service — auto-save, paginated list, search, filter.
 * Business logic only — no req/res access.
 * Uses the AtxDataProvider boundary for persistence.
 */
export class HistoryService {
  /**
   * Create a history entry. Truncates response body if > 500KB.
   */
  async create(data: any) {
    if (data.response?.body) {
      const bodyStr = JSON.stringify(data.response.body);
      if (bodyStr.length > 500_000) {
        data.response.body = {
          _truncated: true,
          _message: `Response body too large (${(bodyStr.length / 1024).toFixed(0)}KB). Truncated for storage.`,
          _preview: bodyStr.substring(0, 1000),
        };
      }
    }

    const history = await dbProvider.history.record({
      id: crypto.randomUUID(),
      userId: data.userId,
      collectionId: data.collectionId,
      requestId: data.requestId,
      environmentName: data.environmentName,
      request: data.request,
      response: data.response,
      executedAt: data.executedAt || new Date().toISOString(),
    });

    return { ...history, _id: history.id };
  }

  /**
   * Paginated list with optional method, status range, and URL search filters.
   */
  async list(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      method?: string;
      search?: string;
      status?: string; // "2xx" | "3xx" | "4xx" | "5xx"
    } = {},
  ) {
    const { page = 1, limit = 50, method, search, status } = options;

    // Note: Advanced filtering (search, method, status) is partially supported by the provider interface
    // or must be implemented in the DB layer. For now, we fetch a larger chunk and filter in-memory if needed,
    // or rely on the provider. The current `dbProvider.history.search` takes limit/offset but doesn't have 
    // advanced filters yet. We will filter in-memory for the boundary proof-of-concept.
    
    // In a real production migration, the AtxDataProvider `search` method would be expanded to accept these filters.
    // We fetch a reasonable max to filter locally since the boundary interface hasn't added these fields yet.
    const allItems = await dbProvider.history.search({ userId, limit: 1000, offset: 0 });

    let filtered = allItems;

    if (method) {
      filtered = filtered.filter(h => (h.request as any)?.method === method);
    }

    if (status) {
      const statusNum = parseInt(status[0]!, 10);
      if (!isNaN(statusNum)) {
        const min = statusNum * 100;
        const max = (statusNum + 1) * 100;
        filtered = filtered.filter(h => {
          const s = (h.response as any)?.status;
          return s >= min && s < max;
        });
      }
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(h => (h.request as any)?.url?.toLowerCase().includes(searchLower));
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      items: items.map(h => ({ ...h, _id: h.id })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single history entry by ID (owner-only).
   */
  async getById(userId: string, id: string) {
    const history = await dbProvider.history.getById({ id, userId });
    if (!history) return null;
    return { ...history, _id: history.id };
  }

  /**
   * Delete a single history entry.
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const h = await dbProvider.history.getById({ id, userId });
    if (!h) return false;
    await dbProvider.history.delete({ id, userId });
    return true;
  }

  /**
   * Clear all history for a user. Returns count of deleted entries.
   */
  async clearAll(userId: string): Promise<number> {
    // Current boundary doesn't return count, so we check length first
    const items = await dbProvider.history.search({ userId, limit: 10000 });
    await dbProvider.history.clearByUser(userId);
    return items.length;
  }
}
