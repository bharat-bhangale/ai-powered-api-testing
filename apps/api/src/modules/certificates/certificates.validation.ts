import { z } from 'zod';

export const CreateCertificateSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  certificateType: z.string().min(1, 'Certificate type is required'),
  filePath: z.string().min(1, 'File path is required'),
  passphrase: z.string().optional(),
});

export const UpdateCertificateSchema = z.object({
  label: z.string().optional(),
  filePath: z.string().optional(),
  passphrase: z.string().optional(),
});
