import { Request, Response, NextFunction } from 'express';
import { CodeGenService } from './code-gen.service';
import { GenerateCodeSchema } from './code-gen.validation';

const codeGenService = new CodeGenService();

export const generateCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = GenerateCodeSchema.parse(req.body);
    const code = codeGenService.generateCode(data.target, data.request, data.redactSecrets);
    res.json({ code });
  } catch (error) {
    next(error);
  }
};
