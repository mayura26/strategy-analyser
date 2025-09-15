import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import '@/lib/init-db';

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
        s.name as strategy_name
      FROM strategy_runs sr
      JOIN strategies s ON sr.strategy_id = s.id
    `;
    
    const args: any[] = [];
    
    if (strategyId) {
      sql += ' WHERE sr.strategy_id = ?';
      args.push(parseInt(strategyId));
    }
    
    sql += ' ORDER BY sr.created_at DESC';

    const result = await db.execute({ sql, args });

    return NextResponse.json({
      success: true,
      runs: result.rows
    });

  } catch (error) {
    console.error('Error fetching runs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { runId, runDescription } = await request.json();

    if (!runId) {
      return NextResponse.json(
        { error: 'Run ID is required' },
        { status: 400 }
      );
    }

    await db.execute({
      sql: 'UPDATE strategy_runs SET run_description = ? WHERE id = ?',
      args: [runDescription || null, parseInt(runId)]
    });

    return NextResponse.json({
      success: true,
      message: 'Run description updated successfully'
    });

  } catch (error) {
    console.error('Error updating run description:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (!runId) {
      return NextResponse.json(
        { error: 'Run ID is required' },
        { status: 400 }
      );
    }

    await db.execute({
      sql: 'DELETE FROM strategy_runs WHERE id = ?',
      args: [parseInt(runId)]
    });

    return NextResponse.json({
      success: true,
      message: 'Run deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
