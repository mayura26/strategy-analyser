import { createClient } from '@libsql/client';

// Database client configuration
const databaseUrl = process.env.DATABASE_URL || 'file:./strategy_analyser.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;


// Create database client with fallback
let db: any;

try {
  // Try to create client with Turso configuration
  db = createClient({
    url: databaseUrl,
    authToken: authToken,
  });
  
  // Test the connection
  db.execute('SELECT 1 as test').then(() => {
    // Connected to Turso database
  }).catch(() => {
    // Fallback to local database
    db = createClient({
      url: 'file:./strategy_analyser.db',
    });
  });
} catch {
  // Fallback to local database
  db = createClient({
    url: 'file:./strategy_analyser.db',
  });
}

export { db };

// Database schema initialization
export async function initializeDatabase() {
  try {
    // Test connection first
    await db.execute('SELECT 1 as test');
    
    // Strategies table - stores strategy metadata
    await db.execute(`
      CREATE TABLE IF NOT EXISTS strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Add notes column to existing strategies table if it doesn't exist
    try {
      await db.execute({
        sql: 'ALTER TABLE strategies ADD COLUMN notes TEXT'
      });
    } catch (error) {
      // Column already exists, ignore the error
      if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
        console.warn('Warning: Could not add notes column:', error instanceof Error ? error.message : String(error));
      }
    }

    // Strategy runs table - stores individual run results
    await db.execute(`
      CREATE TABLE IF NOT EXISTS strategy_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_id INTEGER NOT NULL,
        run_name TEXT,
        run_description TEXT,
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
        highest_intraday_pnl REAL,
        lowest_intraday_pnl REAL,
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

    // Detailed events table - for TP near misses, fill near misses, SL adjustments
    await db.execute(`
      CREATE TABLE IF NOT EXISTS strategy_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('tp_near_miss', 'fill_near_miss', 'sl_adjustment')),
        date DATE NOT NULL,
        time TIME NOT NULL,
        trade_id TEXT,
        direction TEXT,
        target TEXT,
        closest_distance TEXT,
        reason TEXT,
        trigger TEXT,
        adjustment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES strategy_runs (id) ON DELETE CASCADE
      )
    `);

    // Detailed trade summaries table - for trade analysis
    await db.execute(`
      CREATE TABLE IF NOT EXISTS strategy_trade_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        trade_id TEXT NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        direction TEXT NOT NULL,
        line TEXT NOT NULL,
        entry_price REAL NOT NULL,
        high_price REAL NOT NULL,
        low_price REAL NOT NULL,
        max_profit REAL NOT NULL,
        max_loss REAL NOT NULL,
        actual_pnl REAL NOT NULL,
        bars INTEGER NOT NULL,
        max_profit_vs_target REAL,
        max_loss_vs_stop REAL,
        profit_efficiency REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES strategy_runs (id) ON DELETE CASCADE
      )
    `);

    // Add description column to existing strategy_runs table if it doesn't exist
    try {
      await db.execute(`
        ALTER TABLE strategy_runs ADD COLUMN run_description TEXT
      `);
    } catch {
      // Column might already exist, ignore the error
    }

    // Add raw_data column to existing strategy_runs table if it doesn't exist
    try {
      await db.execute(`
        ALTER TABLE strategy_runs ADD COLUMN raw_data TEXT
      `);
    } catch {
      // Column might already exist, ignore the error
    }

    // Add intraday PNL columns to daily_pnl if they don't exist
    try {
      await db.execute(`
        ALTER TABLE daily_pnl ADD COLUMN highest_intraday_pnl REAL
      `);
    } catch {
      // Column might already exist, ignore the error
    }

    try {
      await db.execute(`
        ALTER TABLE daily_pnl ADD COLUMN lowest_intraday_pnl REAL
      `);
    } catch {
      // Column might already exist, ignore the error
    }

    // Add baseline column to strategy_runs if it doesn't exist
    try {
      await db.execute(`
        ALTER TABLE strategy_runs ADD COLUMN is_baseline BOOLEAN DEFAULT FALSE
      `);
    } catch {
      // Column might already exist, ignore the error
    }
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
