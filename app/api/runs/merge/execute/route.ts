import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { runIds, mergedRunName, mergedRunDescription } = await request.json();

    if (!runIds || !Array.isArray(runIds) || runIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 run IDs are required for merging' },
        { status: 400 }
      );
    }

    // Validate run IDs are numbers
    const validRunIds = runIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (validRunIds.length !== runIds.length) {
      return NextResponse.json(
        { error: 'All run IDs must be valid numbers' },
        { status: 400 }
      );
    }

    // First validate that the runs can be merged
    const validationResponse = await fetch(`${request.nextUrl.origin}/api/runs/merge/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runIds: validRunIds })
    });

    if (!validationResponse.ok) {
      const validationError = await validationResponse.json();
      return NextResponse.json(validationError, { status: validationResponse.status });
    }

    const validation = await validationResponse.json();
    if (!validation.canMerge) {
      return NextResponse.json(
        { error: 'Runs cannot be merged' },
        { status: 400 }
      );
    }

    // Get the first run's strategy ID (all runs have the same strategy)
    const firstRunResult = await db.execute({
      sql: 'SELECT strategy_id FROM strategy_runs WHERE id = ?',
      args: [validRunIds[0]]
    });
    const strategyId = firstRunResult.rows[0].strategy_id;

    let mergedRunId: number;
    let totalPnl: number;
    let totalTrades: number;
    let winRate: number;
    let profitFactor: number;
    let maxDrawdown: number;
    let sharpeRatio: number;

    // Create the merged run (no transactions - simple sequential operations like parse route)
    const mergedRunResult = await db.execute({
      sql: `
        INSERT INTO strategy_runs (
          strategy_id, 
          run_name, 
          run_description, 
          net_pnl, 
          total_trades, 
          win_rate, 
          profit_factor, 
          max_drawdown, 
          sharpe_ratio
        ) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0)
      `,
      args: [
        strategyId,
        mergedRunName || `Merged Run (${validRunIds.join(', ')})`,
        mergedRunDescription || `Merged from runs: ${validRunIds.join(', ')}`
      ]
    });

    mergedRunId = Number(mergedRunResult.lastInsertRowid);

    // Merge daily PNL data
    const dailyPnlResult = await db.execute({
      sql: `
        SELECT date, pnl, trades
        FROM daily_pnl
        WHERE run_id IN (${validRunIds.map(() => '?').join(',')})
        ORDER BY date ASC
      `,
      args: validRunIds
    });

    // Group by date and sum PNL and trades
    const dailyPnlMap = new Map<string, {pnl: number, trades: number}>();
    dailyPnlResult.rows.forEach((row: any) => {
      const existing = dailyPnlMap.get(row.date) || { pnl: 0, trades: 0 };
      dailyPnlMap.set(row.date, {
        pnl: existing.pnl + row.pnl,
        trades: existing.trades + (row.trades || 0)
      });
    });

    // Insert merged daily PNL data
    for (const [date, data] of dailyPnlMap) {
      await db.execute({
        sql: 'INSERT INTO daily_pnl (run_id, date, pnl, trades) VALUES (?, ?, ?, ?)',
        args: [mergedRunId, date, data.pnl, data.trades]
      });
    }

    // Copy parameters from the first run (all runs have identical parameters)
    const parametersResult = await db.execute({
      sql: `
        SELECT parameter_name, parameter_value, parameter_type
        FROM strategy_parameters
        WHERE run_id = ?
      `,
      args: [validRunIds[0]]
    });

    for (const param of parametersResult.rows) {
      await db.execute({
        sql: `
          INSERT INTO strategy_parameters (run_id, parameter_name, parameter_value, parameter_type)
          VALUES (?, ?, ?, ?)
        `,
        args: [mergedRunId, param.parameter_name, param.parameter_value, param.parameter_type]
      });
    }

    // Merge events from all runs
    const eventsResult = await db.execute({
      sql: `
        SELECT 
          event_type, date, time, trade_id, direction, target, 
          closest_distance, reason, trigger, adjustment
        FROM strategy_events
        WHERE run_id IN (${validRunIds.map(() => '?').join(',')})
        ORDER BY date, time
      `,
      args: validRunIds
    });

    for (const event of eventsResult.rows) {
      await db.execute({
        sql: `
          INSERT INTO strategy_events (
            run_id, event_type, date, time, trade_id, direction, 
            target, closest_distance, reason, trigger, adjustment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          mergedRunId, event.event_type, event.date, event.time, 
          event.trade_id, event.direction, event.target, event.closest_distance,
          event.reason, event.trigger, event.adjustment
        ]
      });
    }

    // Merge trade summaries from all runs
    const tradesResult = await db.execute({
      sql: `
        SELECT 
          trade_id, date, time, direction, line, entry_price, 
          high_price, low_price, max_profit, max_loss, actual_pnl, 
          bars, max_profit_vs_target, max_loss_vs_stop, profit_efficiency
        FROM strategy_trade_summaries
        WHERE run_id IN (${validRunIds.map(() => '?').join(',')})
        ORDER BY date, time
      `,
      args: validRunIds
    });

    for (const trade of tradesResult.rows) {
      await db.execute({
        sql: `
          INSERT INTO strategy_trade_summaries (
            run_id, trade_id, date, time, direction, line, entry_price,
            high_price, low_price, max_profit, max_loss, actual_pnl,
            bars, max_profit_vs_target, max_loss_vs_stop, profit_efficiency
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          mergedRunId, trade.trade_id, trade.date, trade.time, trade.direction,
          trade.line, trade.entry_price, trade.high_price, trade.low_price,
          trade.max_profit, trade.max_loss, trade.actual_pnl, trade.bars,
          trade.max_profit_vs_target, trade.max_loss_vs_stop, trade.profit_efficiency
        ]
      });
    }

    // Get all trades from the merged run to calculate metrics properly
    const allTradesResult = await db.execute({
      sql: `
        SELECT actual_pnl, date, time
        FROM strategy_trade_summaries
        WHERE run_id = ?
        ORDER BY date, time
      `,
      args: [mergedRunId]
    });

    const allTrades = allTradesResult.rows.map((row: any) => ({
      pnl: row.actual_pnl,
      date: row.date,
      time: row.time
    }));

    // Calculate metrics from individual trades (not daily aggregation)
    totalTrades = allTrades.length;
    totalPnl = allTrades.reduce((sum: number, trade: any) => sum + trade.pnl, 0);
    
    // Calculate win rate from individual trades
    const winningTrades = allTrades.filter((trade: any) => trade.pnl > 0).length;
    winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

    // Calculate profit factor from individual trades
    const totalProfit = allTrades.filter((trade: any) => trade.pnl > 0).reduce((sum: number, trade: any) => sum + trade.pnl, 0);
    const totalLoss = Math.abs(allTrades.filter((trade: any) => trade.pnl < 0).reduce((sum: number, trade: any) => sum + trade.pnl, 0));
    profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);

    // Calculate max drawdown from cumulative PNL curve of individual trades
    maxDrawdown = 0;
    let runningPnl = 0;
    let peak = 0;
    
    for (const trade of allTrades) {
      runningPnl += trade.pnl;
      if (runningPnl > peak) {
        peak = runningPnl;
      }
      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate Sharpe ratio from trade returns
    const tradeReturns = allTrades.map((trade: any) => trade.pnl);
    const avgReturn = tradeReturns.length > 0 ? tradeReturns.reduce((sum: number, ret: number) => sum + ret, 0) / tradeReturns.length : 0;
    const variance = tradeReturns.length > 0 ? tradeReturns.reduce((sum: number, ret: number) => sum + Math.pow(ret - avgReturn, 2), 0) / tradeReturns.length : 0;
    sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;

    // Update the merged run with calculated metrics
    await db.execute({
      sql: `
        UPDATE strategy_runs 
        SET net_pnl = ?, total_trades = ?, win_rate = ?, profit_factor = ?, max_drawdown = ?, sharpe_ratio = ?
        WHERE id = ?
      `,
      args: [totalPnl, totalTrades, winRate, profitFactor, maxDrawdown, sharpeRatio, mergedRunId]
    });

    // Copy and recalculate metrics from all runs
    const metricsResult = await db.execute({
      sql: `
        SELECT metric_name, metric_value, metric_description
        FROM strategy_metrics
        WHERE run_id IN (${validRunIds.map(() => '?').join(',')})
      `,
      args: validRunIds
    });

    // Group metrics by name and sum/average as appropriate
    const metricsMap = new Map<string, {value: number, description?: string, count: number}>();
    metricsResult.rows.forEach((metric: any) => {
      const existing = metricsMap.get(metric.metric_name) || { value: 0, description: metric.metric_description, count: 0 };
      
      // For most metrics, we sum them (like counts, totals)
      // For rates and ratios, we might want to average them
      const isRateOrRatio = metric.metric_name.toLowerCase().includes('rate') || 
                           metric.metric_name.toLowerCase().includes('ratio') ||
                           metric.metric_name.toLowerCase().includes('efficiency');
      
      if (isRateOrRatio) {
        // Average for rates and ratios
        metricsMap.set(metric.metric_name, {
          value: (existing.value * existing.count + metric.metric_value) / (existing.count + 1),
          description: existing.description,
          count: existing.count + 1
        });
      } else {
        // Sum for counts and totals
        metricsMap.set(metric.metric_name, {
          value: existing.value + metric.metric_value,
          description: existing.description,
          count: existing.count + 1
        });
      }
    });

    // Insert merged metrics
    for (const [metricName, metricData] of metricsMap) {
      await db.execute({
        sql: `
          INSERT INTO strategy_metrics (run_id, metric_name, metric_value, metric_description)
          VALUES (?, ?, ?, ?)
        `,
        args: [mergedRunId, metricName, metricData.value, metricData.description]
      });
    }

    // Calculate the merged date range from the daily PNL data
    const sortedDates = Array.from(dailyPnlMap.keys()).sort();
    const mergedDateRange = sortedDates.length > 0 ? {
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1]
    } : null;

    // Return response after successful merge
    return NextResponse.json({
      success: true,
      mergedRunId,
      message: `Successfully merged ${validRunIds.length} runs into run #${mergedRunId}`,
      mergedRun: {
        id: mergedRunId,
        name: mergedRunName || `Merged Run (${validRunIds.join(', ')})`,
        description: mergedRunDescription || `Merged from runs: ${validRunIds.join(', ')}`,
        netPnl: totalPnl,
        totalTrades,
        winRate,
        profitFactor,
        maxDrawdown,
        sharpeRatio,
        dateRange: mergedDateRange
      }
    });

  } catch (error) {
    console.error('Error executing merge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
