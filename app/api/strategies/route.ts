import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import '@/lib/init-db';

export async function GET() {
  try {
    const result = await db.execute({
      sql: `
        SELECT 
          s.id,
          s.name,
          s.description,
          s.created_at,
          COUNT(sr.id) as run_count,
          AVG(sr.net_pnl) as avg_net_pnl,
          MAX(sr.net_pnl) as best_net_pnl,
          MIN(sr.net_pnl) as worst_net_pnl
        FROM strategies s
        LEFT JOIN strategy_runs sr ON s.id = sr.strategy_id
        GROUP BY s.id, s.name, s.description, s.created_at
        ORDER BY s.created_at DESC
      `
    });

    return NextResponse.json({
      success: true,
      strategies: result.rows
    });

  } catch (error) {
    console.error('Error fetching strategies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
