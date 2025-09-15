import { createClient } from '@libsql/client';

// Database client configuration
export const db = createClient({
  url: process.env.DATABASE_URL || 'file:./strategy_analyser.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Database schema initialization
export async function initializeDatabase() {
  try {
    // Strategies table - stores strategy metadata
    await db.execute(`
      CREATE TABLE IF NOT EXISTS strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Strategy runs table - stores individual run results
    await db.execute(`
      CREATE TABLE IF NOT EXISTS strategy_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_id INTEGER NOT NULL,
        run_name TEXT,
        net_pnl REAL NOT NULL,
        total_trades INTEGER,
        win_rate REAL,
        profit_factor REAL,
        max_drawdown REAL,
        sharpe_ratio REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (strategy_id) REFERENCES strategies (id) ON DELETE CASCADE
      )
    `);

    // Daily PNL table - stores daily performance breakdown
    await db.execute(`
      CREATE TABLE IF NOT EXISTS daily_pnl (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        date DATE NOT NULL,
        pnl REAL NOT NULL,
        trades INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES strategy_runs (id) ON DELETE CASCADE,
        UNIQUE(run_id, date)
      )
    `);

    // Strategy parameters table - flexible parameter storage
    await db.execute(`
      CREATE TABLE IF NOT EXISTS strategy_parameters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        parameter_name TEXT NOT NULL,
        parameter_value TEXT NOT NULL,
        parameter_type TEXT NOT NULL CHECK (parameter_type IN ('string', 'number', 'boolean', 'date')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES strategy_runs (id) ON DELETE CASCADE
      )
    `);

    // Strategy-specific metrics table - for custom metrics per strategy
    await db.execute(`
      CREATE TABLE IF NOT EXISTS strategy_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES strategy_runs (id) ON DELETE CASCADE
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Helper function to get or create strategy
export async function getOrCreateStrategy(name: string, description?: string) {
  try {
    // Try to find existing strategy
    const existing = await db.execute({
      sql: 'SELECT id FROM strategies WHERE name = ?',
      args: [name]
    });

    if (existing.rows.length > 0) {
      return existing.rows[0].id as number;
    }

    // Create new strategy
    const result = await db.execute({
      sql: 'INSERT INTO strategies (name, description) VALUES (?, ?)',
      args: [name, description || '']
    });

    return Number(result.lastInsertRowid);
  } catch (error) {
    console.error('Error getting or creating strategy:', error);
    throw error;
  }
}
