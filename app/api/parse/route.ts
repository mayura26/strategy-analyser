import { NextRequest, NextResponse } from 'next/server';
import { parserRegistry } from '@/lib/parsers/parser-registry';
import { db, getOrCreateStrategy } from '@/lib/database';
import '@/lib/init-db';

export async function POST(request: NextRequest) {
  try {
    const { rawData } = await request.json();

    if (!rawData || typeof rawData !== 'string') {
      return NextResponse.json(
        { error: 'Raw data is required and must be a string' },
        { status: 400 }
      );
    }

    // Parse the raw data
    const parsedData = parserRegistry.parseRawData(rawData);

    if (!parsedData) {
      return NextResponse.json(
        { error: 'Unable to parse the provided data. No suitable parser found.' },
        { status: 400 }
      );
    }

    // Get or create strategy
    const strategyId = await getOrCreateStrategy(parsedData.strategyName);

    // Insert the run data
    const runResult = await db.execute({
      sql: `
        INSERT INTO strategy_runs 
        (strategy_id, run_name, net_pnl, total_trades, win_rate, profit_factor, max_drawdown, sharpe_ratio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        strategyId,
        parsedData.runName || null,
        parsedData.netPnl,
        parsedData.totalTrades || null,
        parsedData.winRate || null,
        parsedData.profitFactor || null,
        parsedData.maxDrawdown || null,
        parsedData.sharpeRatio || null
      ]
    });

    const runId = runResult.lastInsertRowid as number;

    // Insert daily PNL data
    for (const daily of parsedData.dailyPnl) {
      await db.execute({
        sql: `
          INSERT INTO daily_pnl (run_id, date, pnl, trades)
          VALUES (?, ?, ?, ?)
        `,
        args: [runId, daily.date, daily.pnl, daily.trades || 0]
      });
    }

    // Insert parameters
    for (const param of parsedData.parameters) {
      await db.execute({
        sql: `
          INSERT INTO strategy_parameters (run_id, parameter_name, parameter_value, parameter_type)
          VALUES (?, ?, ?, ?)
        `,
        args: [runId, param.name, param.value, param.type]
      });
    }

    // Insert custom metrics
    for (const metric of parsedData.customMetrics) {
      await db.execute({
        sql: `
          INSERT INTO strategy_metrics (run_id, metric_name, metric_value, metric_description)
          VALUES (?, ?, ?, ?)
        `,
        args: [runId, metric.name, metric.value, metric.description || null]
      });
    }

    return NextResponse.json({
      success: true,
      runId: Number(runId),
      strategyName: parsedData.strategyName,
      message: 'Data parsed and saved successfully'
    });

  } catch (error) {
    console.error('Error parsing data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
