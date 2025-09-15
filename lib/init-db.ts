import { initializeDatabase } from './database';

// Initialize database on module load
initializeDatabase().catch(console.error);
