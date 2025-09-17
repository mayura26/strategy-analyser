import { NextRequest, NextResponse } from 'next/server';
import { parserRegistry } from '@/lib/parsers/parser-registry';
import { db, getOrCreateStrategy } from '@/lib/database';
import '@/lib/init-db';

export async function POST(request: NextRequest) {
  try {
    const { rawData, runDescription } = await request.json();

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

    // Add the description if provided
    if (runDescription) {
      parsedData.runDescription = runDescription;
    }

    // Get or create strategy
    const strategyId = await getOrCreateStrategy(parsedData.strategyName);


    // Insert the run data
    const runResult = await db.execute({
      sql: `
        INSERT INTO strategy_runs 
        (strategy_id, run_name, run_description, net_pnl, total_trades, win_rate, profit_factor, max_drawdown, sharpe_ratio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        strategyId,
        parsedData.runName || null,
        parsedData.runDescription || null,
        parsedData.netPnl,
        parsedData.totalTrades || null,
        parsedData.winRate || null,
        parsedData.profitFactor || null,
        parsedData.maxDrawdown || null,
        parsedData.sharpeRatio || null
      ]
    });

    const runId = Number(runResult.lastInsertRowid);

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

    // Insert detailed events
    if (parsedData.detailedEvents) {
      // Insert TP near misses
      for (const event of parsedData.detailedEvents.tpNearMisses) {
        await db.execute({
          sql: `
            INSERT INTO strategy_events (run_id, event_type, date, time, trade_id, direction, target, closest_distance, reason)
            VALUES (?, 'tp_near_miss', ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [runId, event.date, event.time, event.tradeId, event.direction, event.target, event.closestDistance, event.reason]
        });
      }

      // Insert fill near misses
      for (const event of parsedData.detailedEvents.fillNearMisses) {
        await db.execute({
          sql: `
            INSERT INTO strategy_events (run_id, event_type, date, time, direction, closest_distance)
            VALUES (?, 'fill_near_miss', ?, ?, ?, ?)
          `,
          args: [runId, event.date, event.time, event.direction, event.closestDistance]
        });
      }

      // Insert SL adjustments
      for (const event of parsedData.detailedEvents.slAdjustments) {
        await db.execute({
          sql: `
            INSERT INTO strategy_events (run_id, event_type, date, time, trade_id, direction, trigger, adjustment)
            VALUES (?, 'sl_adjustment', ?, ?, ?, ?, ?, ?)
          `,
          args: [runId, event.date, event.time, event.tradeId, event.direction, event.trigger, event.adjustment]
        });
      }
    }

    // Insert detailed trade summaries
    if (parsedData.detailedTrades) {
      for (const trade of parsedData.detailedTrades) {
        await db.execute({
          sql: `
            INSERT INTO strategy_trade_summaries (
              run_id, trade_id, date, time, direction, line, entry_price, high_price, low_price,
              max_profit, max_loss, actual_pnl, bars, max_profit_vs_target, max_loss_vs_stop, profit_efficiency
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            runId, trade.tradeId, trade.date, trade.time, trade.direction, trade.line,
            trade.entry, trade.high, trade.low, trade.maxProfit, trade.maxLoss, trade.actualPnl,
            trade.bars, trade.maxProfitVsTarget, trade.maxLossVsStop, trade.profitEfficiency
          ]
        });
      }
    }

    return NextResponse.json({
      success: true,
      runId: Number(runId),
      strategyName: parsedData.strategyName,
      message: 'Data parsed and saved successfully',
      summary: {
        totalTrades: parsedData.totalTrades || 0,
        netPnl: parsedData.netPnl || 0,
        winRate: parsedData.winRate || 0,
        profitFactor: parsedData.profitFactor || 0,
        maxDrawdown: parsedData.maxDrawdown || 0,
        days: parsedData.dailyPnl?.length || 0
      }
    });

  } catch (error) {
    console.error('Error parsing data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
