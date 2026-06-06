import { eq, and } from 'drizzle-orm';
import { getDb } from '../client';
import { certificates, type CertificateRow, type InsertCertificateRow } from '../schema';

// ===== Types =====

export interface CertificateRecord {
  id: string;
  userId: string;
  label: string;
  certificateType: string;
  filePath: string;
  passphraseSecretRefId?: string;
  fingerprint?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCertificateInput {
  id: string;
  userId: string;
  label: string;
  certificateType: string;
  filePath: string;
  passphraseSecretRefId?: string;
  fingerprint?: string;
  expiresAt?: string;
}

export interface UpdateCertificateInput {
  id: string;
  userId: string;
  label?: string;
  filePath?: string;
  passphraseSecretRefId?: string | null;
}

// ===== Map Row =====

function rowToRecord(row: CertificateRow): CertificateRecord {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    certificateType: row.certificateType,
    filePath: row.filePath,
    passphraseSecretRefId: row.passphraseSecretRefId ?? undefined,
    fingerprint: row.fingerprint ?? undefined,
    expiresAt: row.expiresAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===== Repository =====

export const certificatesRepository = {
  async listByUser(userId: string): Promise<CertificateRecord[]> {
    const db = getDb();
    const rows = await db.select().from(certificates).where(eq(certificates.userId, userId));
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<CertificateRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(certificates)
      .where(and(eq(certificates.id, params.id), eq(certificates.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async create(input: CreateCertificateInput): Promise<CertificateRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertCertificateRow = {
      id: input.id,
      userId: input.userId,
      label: input.label,
      certificateType: input.certificateType,
      filePath: input.filePath,
      passphraseSecretRefId: input.passphraseSecretRefId ?? null,
      fingerprint: input.fingerprint ?? null,
      expiresAt: input.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(certificates).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to create certificate');
    return created;
  },

  async update(input: UpdateCertificateInput): Promise<CertificateRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertCertificateRow> = { updatedAt: now };

    if (input.label !== undefined) patch.label = input.label;
    if (input.filePath !== undefined) patch.filePath = input.filePath;
    if (input.passphraseSecretRefId !== undefined) patch.passphraseSecretRefId = input.passphraseSecretRefId;

    await db.update(certificates).set(patch).where(and(eq(certificates.id, input.id), eq(certificates.userId, input.userId)));
    const updated = await this.getById({ id: input.id, userId: input.userId });
    if (!updated) throw new Error('Certificate not found after update');
    return updated;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(certificates).where(and(eq(certificates.id, params.id), eq(certificates.userId, params.userId)));
  },
};
