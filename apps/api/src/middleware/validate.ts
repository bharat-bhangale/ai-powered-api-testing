import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Zod validation middleware factory.
 * Returns middleware that validates req.body against the provided schema.
 *
 * Usage in routes:
 *   router.post('/', validate(createCollectionSchema), controller.create);
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.flatten();
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: errors.fieldErrors,
        },
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
