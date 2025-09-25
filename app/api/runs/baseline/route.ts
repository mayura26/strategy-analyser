import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import '@/lib/init-db';

export async function POST(request: NextRequest) {
  try {
    const { runId, isBaseline } = await request.json();

    if (!runId || typeof isBaseline !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request. runId and isBaseline are required.' },
        { status: 400 }
      );
    }

    // If setting as baseline, first unset any existing baseline for the same strategy
    if (isBaseline) {
      // Get the strategy_id for this run
      const runResult = await db.execute({
        sql: 'SELECT strategy_id FROM strategy_runs WHERE id = ?',
        args: [runId]
      });

      if (runResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Run not found' },
          { status: 404 }
        );
      }

      const strategyId = runResult.rows[0].strategy_id;

      // Unset any existing baseline for this strategy
      await db.execute({
        sql: 'UPDATE strategy_runs SET is_baseline = FALSE WHERE strategy_id = ? AND is_baseline = TRUE',
        args: [strategyId]
      });
    }

    // Set the baseline status for the specified run
    await db.execute({
      sql: 'UPDATE strategy_runs SET is_baseline = ? WHERE id = ?',
      args: [isBaseline, runId]
    });

    return NextResponse.json({
      success: true,
      message: isBaseline ? 'Run set as baseline' : 'Run unset as baseline'
    });

  } catch (error) {
    console.error('Error updating baseline status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('strategyId');

    let sql = `
      SELECT 
        sr.id,
        sr.run_name,
        sr.run_description,
        sr.net_pnl,
        sr.total_trades,
        sr.win_rate,
        sr.profit_factor,
        sr.max_drawdown,
        sr.sharpe_ratio,
        sr.created_at,
        sr.is_baseline,
        s.name as strategy_name
      FROM strategy_runs sr
      JOIN strategies s ON sr.strategy_id = s.id
      WHERE sr.is_baseline = TRUE
    `;
    
    const args: any[] = [];
    
    if (strategyId) {
      sql += ' AND sr.strategy_id = ?';
      args.push(parseInt(strategyId));
    }

    const result = await db.execute({ sql, args });

    return NextResponse.json({
      success: true,
      baselineRun: result.rows.length > 0 ? result.rows[0] : null
    });

  } catch (error) {
    console.error('Error fetching baseline run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
