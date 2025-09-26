import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (isNaN(runId)) {
      return NextResponse.json(
        { error: 'Invalid run ID' },
        { status: 400 }
      );
    }

    let sql: string;
    let args: any[];

    if (date) {
      // Fetch data for specific date
      sql = `
        SELECT date, pnl, trades, highest_intraday_pnl, lowest_intraday_pnl
        FROM daily_pnl
        WHERE run_id = ? AND date = ?
        ORDER BY date ASC
      `;
      args = [runId, date];
    } else {
      // Fetch all data
      sql = `
        SELECT date, pnl, trades, highest_intraday_pnl, lowest_intraday_pnl
        FROM daily_pnl
        WHERE run_id = ?
        ORDER BY date ASC
      `;
      args = [runId];
    }

    const result = await db.execute({ sql, args });

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
