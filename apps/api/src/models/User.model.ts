import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// ===== Interface =====

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  avatar?: string;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    editorFontSize: number;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

// ===== Schema =====

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    preferences: {
      theme: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'dark',
      },
      editorFontSize: {
        type: Number,
        default: 14,
      },
    },
  },
  { timestamps: true },
);

// ===== Pre-save: Hash password =====

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ===== Instance method: Compare password =====

userSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

// ===== toJSON: Strip sensitive fields =====

userSchema.set('toJSON', {
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

// ===== Export =====

export const User = mongoose.model<IUser>('User', userSchema);
