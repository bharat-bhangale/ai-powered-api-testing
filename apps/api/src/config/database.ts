import mongoose from 'mongoose';
import { env } from './env';

/**
 * Connects to MongoDB Atlas.
 * Retries once on failure, then exits.
 */
export async function connectDatabase(): Promise<void> {
  try {
    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not configured');
    }
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}
