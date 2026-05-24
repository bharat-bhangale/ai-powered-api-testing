import { History, type IHistory } from '../../models/History.model';

/**
 * History service — auto-save, paginated list, search, filter.
 * Business logic only — no req/res access.
 */
export class HistoryService {
  /**
   * Create a history entry. Truncates response body if > 500KB.
   */
  async create(data: Partial<IHistory>): Promise<IHistory> {
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
    return History.create(data);
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
  ): Promise<{ items: Record<string, unknown>[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 50, method, search, status } = options;

    const query: Record<string, unknown> = { userId };

    if (method) query['request.method'] = method;

    if (status) {
      const statusNum = parseInt(status[0]!, 10);
      if (!isNaN(statusNum)) {
        query['response.status'] = { $gte: statusNum * 100, $lt: (statusNum + 1) * 100 };
      }
    }

    if (search) {
      query['request.url'] = { $regex: search, $options: 'i' };
    }

    const total = await History.countDocuments(query);
    const items = await History.find(query)
      .sort({ executedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      items: items as Record<string, unknown>[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single history entry by ID (owner-only).
   */
  async getById(userId: string, id: string): Promise<IHistory | null> {
    return History.findOne({ _id: id, userId });
  }

  /**
   * Delete a single history entry.
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const result = await History.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  }

  /**
   * Clear all history for a user. Returns count of deleted entries.
   */
  async clearAll(userId: string): Promise<number> {
    const result = await History.deleteMany({ userId });
    return result.deletedCount;
  }
}
