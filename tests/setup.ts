import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '@shared/schema';

// Test database configuration
const testDatabaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/test_db';

let pool: Pool;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  // Initialize test database connection
  pool = new Pool({ connectionString: testDatabaseUrl });
  db = drizzle({ client: pool, schema });
  
  // Run migrations for test database
  try {
    // await migrate(db, { migrationsFolder: './drizzle' });
  } catch (error) {
    console.warn('Migration failed or not needed:', error);
  }
});

afterAll(async () => {
  // Clean up database connection
  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  // Clean up database before each test
  await cleanupDatabase();
});

async function cleanupDatabase() {
  if (!db) return;
  
  try {
    // Clear all test data - order matters due to foreign keys
    await db.delete(schema.shifts);
    await db.delete(schema.contracts);
  } catch (error) {
    console.warn('Database cleanup failed:', error);
  }
}

// Export for use in tests
export { db, pool };