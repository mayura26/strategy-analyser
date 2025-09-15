import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

// Define the type for strategy trade summaries row
interface StrategyTradeSummaryRow {
  trade_id: string;
  date: string;
  time: string;
  direction: string;
  line: string;
  entry_price: number;
  high_price: number;
  low_price: number;
  max_profit: number;
  max_loss: number;
  actual_pnl: number;
  bars: number;
  max_profit_vs_target: number | null;
  max_loss_vs_stop: number | null;
  profit_efficiency: number | null;
}

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

    // Get all trade summaries for this run
    const result = await db.execute({
      sql: `
        SELECT 
          trade_id,
          date,
          time,
          direction,
          line,
          entry_price,
          high_price,
          low_price,
          max_profit,
          max_loss,
          actual_pnl,
          bars,
          max_profit_vs_target,
          max_loss_vs_stop,
          profit_efficiency
        FROM strategy_trade_summaries
        WHERE run_id = ?
        ORDER BY date, time ASC
      `,
      args: [runId]
    });

    const trades = result.rows.map((row: StrategyTradeSummaryRow) => ({
      tradeId: row.trade_id,
      date: row.date,
      time: row.time,
      direction: row.direction,
      line: row.line,
      entry: row.entry_price,
      high: row.high_price,
      low: row.low_price,
      maxProfit: row.max_profit,
      maxLoss: row.max_loss,
      actualPnl: row.actual_pnl,
      bars: row.bars,
      maxProfitVsTarget: row.max_profit_vs_target,
      maxLossVsStop: row.max_loss_vs_stop,
      profitEfficiency: row.profit_efficiency
    }));

    return NextResponse.json({
      success: true,
      trades
    });

  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
