import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runId = parseInt(id);

    if (isNaN(runId)) {
      return NextResponse.json(
        { error: 'Invalid run ID' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: `
        SELECT date, pnl, trades, highest_intraday_pnl, lowest_intraday_pnl
        FROM daily_pnl
        WHERE run_id = ?
        ORDER BY date ASC
      `,
      args: [runId]
    });

    return NextResponse.json({
      success: true,
      dailyPnl: result.rows
    });

  } catch (error) {
    console.error('Error fetching daily PNL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
