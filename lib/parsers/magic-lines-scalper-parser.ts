import { BaseStrategyParser, ParsedRunData } from './base-parser';

export class MagicLinesScalperParser extends BaseStrategyParser {
  strategyName = 'MagicLinesScalper';

  canParse(rawData: string): boolean {
    return rawData.includes('MagicLinesScalper') || 
           rawData.includes('Magic Lines') ||
           rawData.includes('RTH Magic Lines');
  }

  parse(rawData: string): ParsedRunData {
    console.log('=== MagicLinesScalperParser.parse() START ===');
    const lines = rawData.split('\n');
    console.log(`Raw data length: ${rawData.length} characters, ${lines.length} lines`);
    
    // Extract strategy name and run ID
    const strategyMatch = rawData.match(/Strategy '([^']+)'/);
    const strategyName = strategyMatch ? strategyMatch[1] : 'MagicLinesScalper';
    console.log(`Strategy name extracted: ${strategyName}`);
    
    // Extract parameters from the detailed parameter section
    console.log('Extracting parameters...');
    const parameters = this.extractParameters(rawData);
    console.log(`Extracted ${parameters.length} parameters`);
    
    // Extract trade data and calculate metrics
    console.log('Extracting trade data...');
    const tradeData = this.extractTradeData(rawData);
    console.log(`Extracted ${tradeData.length} trades`);
    
    // Calculate daily PNL from trade summaries
    console.log('Calculating daily PNL...');
    const dailyPnl = this.calculateDailyPnl(tradeData);
    console.log(`Calculated daily PNL for ${dailyPnl.length} days`);
    
    // Calculate overall metrics from individual trades
    const totalTrades = tradeData.length;
    const netPnl = tradeData.reduce((sum, trade) => sum + trade.pnl, 0);
    const winningTrades = tradeData.filter(trade => trade.pnl > 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    
    console.log(`Total trades: ${totalTrades}, Net PNL: ${netPnl}, Win rate: ${winRate}`);
    
    
    // Calculate profit factor
    const grossProfit = tradeData.filter(trade => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(tradeData.filter(trade => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    
    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(tradeData);

    // Ensure all values are finite
    const ensureFinite = (value: number, defaultValue: number = 0): number => {
      return isFinite(value) ? value : defaultValue;
    };
    
    // Extract custom metrics
    const customMetrics = this.extractCustomMetrics(rawData, tradeData);

    const result = {
      strategyName: this.strategyName,
      runName: strategyName,
      netPnl: ensureFinite(netPnl),
      totalTrades: ensureFinite(totalTrades),
      winRate: ensureFinite(winRate),
      profitFactor: ensureFinite(profitFactor),
      maxDrawdown: ensureFinite(maxDrawdown),
      sharpeRatio: 0, // Would need more data to calculate
      dailyPnl,
      parameters,
      customMetrics
    };
    
    console.log('=== FINAL RESULT ===');
    console.log(`Strategy: ${result.strategyName}`);
    console.log(`Run Name: ${result.runName}`);
    console.log(`Net PNL: $${result.netPnl}`);
    console.log(`Total Trades: ${result.totalTrades}`);
    console.log(`Win Rate: ${result.winRate}`);
    console.log(`Profit Factor: ${result.profitFactor}`);
    console.log(`Max Drawdown: $${result.maxDrawdown}`);
    console.log(`Daily PNL entries: ${result.dailyPnl.length}`);
    console.log(`Parameters: ${result.parameters.length}`);
    console.log(`Custom Metrics: ${result.customMetrics.length}`);
    console.log('=== MagicLinesScalperParser.parse() END ===');
    
    return result;
  }

  private extractParameters(rawData: string): Array<{ name: string; value: string; type: 'string' | 'number' | 'boolean' | 'date' }> {
    const parameters: Array<{ name: string; value: string; type: 'string' | 'number' | 'boolean' | 'date' }> = [];
    
    // Main parameters
    const mainParams = [
      { name: 'Trade Quantity', pattern: /Trade Quantity:\s*(\d+)/i, type: 'number' as const },
      { name: 'Max Gain', pattern: /Max Gain:\s*\$(\d+)/i, type: 'number' as const },
      { name: 'Max Loss', pattern: /Max Loss:\s*\$(\d+)/i, type: 'number' as const },
      { name: 'Max Consecutive Losses', pattern: /Max Consecutive Losses:\s*(\d+)/i, type: 'number' as const },
      { name: 'Loss Cut Off', pattern: /Loss Cut Off:\s*\$(\d+)/i, type: 'number' as const },
      { name: 'Full Take Profit', pattern: /Full Take Profit:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'Full Stop Loss', pattern: /Full Stop Loss:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
    ];

    // Entry logic parameters
    const entryParams = [
      { name: 'Min Distance From Line', pattern: /Min Distance From Line:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'Max Distance From Line', pattern: /Max Distance From Line:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'Entry Offset', pattern: /Entry Offset:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'Line Cross Bar Count', pattern: /Line Cross Bar Count:\s*(\d+)/i, type: 'number' as const },
      { name: 'Upside Short Trades', pattern: /Upside Short Trades:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'Downside Long Trades', pattern: /Downside Long Trades:\s*(True|False)/i, type: 'boolean' as const },
    ];

    // Position management parameters
    const positionParams = [
      { name: 'Dynamic Trim', pattern: /Dynamic Trim:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'Trim Percent', pattern: /Trim Percent:\s*(\d+)%/i, type: 'number' as const },
      { name: 'Trim Take Profit', pattern: /Trim Take Profit:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'SL Adjustment', pattern: /SL Adjustment:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'X1', pattern: /X1:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'X2', pattern: /X2:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'L1', pattern: /L1:\s*([+-]?\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'L2', pattern: /L2:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
    ];

    // Time parameters
    const timeParams = [
      { name: 'Start Time', pattern: /Start Time:\s*(\d{2}:\d{2})/i, type: 'string' as const },
      { name: 'End Time', pattern: /End Time:\s*(\d{2}:\d{2})/i, type: 'string' as const },
    ];

    // Magic lines parameters
    const magicLinesParams = [
      { name: 'Upside Levels', pattern: /Upside Levels:\s*([\d.,\s]+)/i, type: 'string' as const },
      { name: 'Downside Levels', pattern: /Downside Levels:\s*([\d.,\s]+)/i, type: 'string' as const },
      { name: 'Mini Mode', pattern: /Mini Mode:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'Instrument', pattern: /Instrument:\s*(\w+)/i, type: 'string' as const },
    ];

    // Extract all parameters
    const allParams = [...mainParams, ...entryParams, ...positionParams, ...timeParams, ...magicLinesParams];
    
    for (const param of allParams) {
      const value = this.extractString(rawData, param.pattern);
      if (value) {
        parameters.push({
          name: param.name,
          value,
          type: param.type
        });
      }
    }

    return parameters;
  }

  private extractTradeData(rawData: string): Array<{
    date: string;
    time: string;
    direction: 'LONG' | 'SHORT';
    entry: number;
    exit: number;
    pnl: number;
    maxProfit: number;
    maxLoss: number;
    bars: number;
    line: string;
    barsSinceLastTrade: number;
    quantity: number;
    points: number;
    slAdjustments: number;
    nearMisses: number;
  }> {
    console.log('=== extractTradeData() START ===');
    const trades: Array<{
      date: string;
      time: string;
      direction: 'LONG' | 'SHORT';
      entry: number;
      exit: number;
      pnl: number;
      maxProfit: number;
      maxLoss: number;
      bars: number;
      line: string;
      barsSinceLastTrade: number;
      quantity: number;
      points: number;
      slAdjustments: number;
      nearMisses: number;
    }> = [];

    // Extract trade fills first - now with ID support
    const tradeFillPattern = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[TRADE FILL \(ID: (\d+)\)\]\s+(LONG|SHORT)\s+FILLED:\s*([\d.]+)\s*\|\s*Bars Since Last Trade:\s*(\d+)/gi;
    console.log('Looking for trade fills with pattern:', tradeFillPattern);
    
    const tradeFills: Array<{
      date: string;
      time: string;
      id: string;
      direction: 'LONG' | 'SHORT';
      entry: number;
      barsSinceLastTrade: number;
    }> = [];

    let match;
    while ((match = tradeFillPattern.exec(rawData)) !== null) {
      const [, date, time, id, direction, entryStr, barsSinceLastTradeStr] = match;
      const tradeId = `${date}_${id}`;
      tradeFills.push({
        date,
        time,
        id: tradeId,
        direction: direction as 'LONG' | 'SHORT',
        entry: parseFloat(entryStr),
        barsSinceLastTrade: parseInt(barsSinceLastTradeStr)
      });
      console.log(`Found trade fill: ${date} ${time} ID:${id} ${direction} at ${entryStr}`);
    }
    console.log(`Total trade fills found: ${tradeFills.length}`);

    // Extract trade summaries - now with ID support
    const tradeSummaryPattern = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[TRADE SUMMARY \(ID: (\d+)\)\]\s+(LONG|SHORT)\s*\|\s*Line:\s*([^|]+)\s*\|\s*Entry:\s*([\d.]+)\s*\|\s*High:\s*([\d.]+)\s*\|\s*Low:\s*([\d.]+)\s*\|\s*Max Profit:\s*([+-]?[\d.]+)pts\s*\|\s*Max Loss:\s*([+-]?[\d.]+)pts\s*\|\s*Bars:\s*(\d+)/gi;

    const tradeSummaries: Array<{
      date: string;
      time: string;
      id: string;
      direction: 'LONG' | 'SHORT';
      line: string;
      entry: number;
      high: number;
      low: number;
      maxProfit: number;
      maxLoss: number;
      bars: number;
    }> = [];

    while ((match = tradeSummaryPattern.exec(rawData)) !== null) {
      const [, date, time, id, direction, line, entryStr, highStr, lowStr, maxProfitStr, maxLossStr, barsStr] = match;
      const tradeId = `${date}_${id}`;
      tradeSummaries.push({
        date,
        time,
        id: tradeId,
        direction: direction as 'LONG' | 'SHORT',
        line: line.trim(),
        entry: parseFloat(entryStr),
        high: parseFloat(highStr),
        low: parseFloat(lowStr),
        maxProfit: parseFloat(maxProfitStr),
        maxLoss: parseFloat(maxLossStr),
        bars: parseInt(barsStr)
      });
      console.log(`Found trade summary: ${date} ${time} ID:${id} ${direction} - Entry: ${entryStr}, Max Profit: ${maxProfitStr}pts, Max Loss: ${maxLossStr}pts`);
    }
    console.log(`Total trade summaries found: ${tradeSummaries.length}`);

    // Extract PNL updates - now with ID support
    const pnlUpdatePattern = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[PNL UPDATE \(ID: (\d+)\)\]\s+COMPLETED TRADE PnL:\s*\$([+-]?[\d.]+)\s*\|\s*Total PnL:\s*\$([+-]?[\d.]+)/gi;

    const pnlUpdates: Array<{
      date: string;
      time: string;
      id: string;
      completedTradePnl: number;
      totalPnl: number;
    }> = [];

    while ((match = pnlUpdatePattern.exec(rawData)) !== null) {
      const [, date, time, id, completedTradePnlStr, totalPnlStr] = match;
      const tradeId = `${date}_${id}`;
      pnlUpdates.push({
        date,
        time,
        id: tradeId,
        completedTradePnl: parseFloat(completedTradePnlStr),
        totalPnl: parseFloat(totalPnlStr)
      });
      console.log(`Found PNL update: ${date} ${time} ID:${id} - Completed Trade PnL: $${completedTradePnlStr}, Total PnL: $${totalPnlStr}`);
    }
    console.log(`Total PNL updates found: ${pnlUpdates.length}`);

    // Extract additional trade data (quantity, points, etc.) - now with ID support
    const currentTradePnlPattern = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[PNL UPDATE \(ID: (\d+)\)\]\s+CURRENT TRADE PnL:\s*\$([+-]?[\d.]+)\s*\|\s*Current PnL:\s*\$([+-]?[\d.]+)\s*\|\s*Points\s*:\s*([+-]?[\d.]+)\s*\|\s*Quantity:\s*(\d+)/gi;

    const currentTradeData: Array<{
      date: string;
      time: string;
      id: string;
      quantity: number;
      points: number;
    }> = [];

    while ((match = currentTradePnlPattern.exec(rawData)) !== null) {
      const [, date, time, id, , , pointsStr, quantityStr] = match;
      const tradeId = `${date}_${id}`;
      currentTradeData.push({
        date,
        time,
        id: tradeId,
        quantity: parseInt(quantityStr),
        points: parseFloat(pointsStr)
      });
      console.log(`Found current trade data: ${date} ${time} ID:${id} - Points: ${pointsStr}, Quantity: ${quantityStr}`);
    }
    console.log(`Total current trade data found: ${currentTradeData.length}`);

    // Count SL adjustments and near misses per trade - now with ID support
    const slAdjustmentPattern = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+(?:\[TRADE SL \(ID: \d+\)\]|SL Adjustment|Short position: Price reached X[12]|Long position: Price reached X[12])/g;
    const nearMissPattern = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[(?:TP )?NEAR MISS \(ID: \d+\)\]/g;


    // Match all trade components together using IDs
    console.log('=== MATCHING TRADE COMPONENTS BY ID ===');
    
    // Create lookup maps for faster matching
    const summaryMap = new Map<string, typeof tradeSummaries[0]>();
    const pnlMap = new Map<string, typeof pnlUpdates[0]>();
    const currentTradeMap = new Map<string, typeof currentTradeData[0]>();
    
    tradeSummaries.forEach(summary => summaryMap.set(summary.id, summary));
    pnlUpdates.forEach(pnl => pnlMap.set(pnl.id, pnl));
    currentTradeData.forEach(current => currentTradeMap.set(current.id, current));
    
    console.log(`Created lookup maps - Summaries: ${summaryMap.size}, PNL: ${pnlMap.size}, Current Trade: ${currentTradeMap.size}`);

    for (const tradeFill of tradeFills) {
      console.log(`\nProcessing trade fill: ${tradeFill.date} ${tradeFill.time} ${tradeFill.direction} ID:${tradeFill.id} at ${tradeFill.entry}`);
      
      // Find components by ID
      const summary = summaryMap.get(tradeFill.id);
      const pnlUpdate = pnlMap.get(tradeFill.id);
      const currentTrade = currentTradeMap.get(tradeFill.id);

      if (summary) {
        console.log(`  Found matching summary: ${summary.date} ${summary.time} ${summary.direction} - Entry: ${summary.entry}, Max Profit: ${summary.maxProfit}pts, Max Loss: ${summary.maxLoss}pts`);
        
        const pnl = pnlUpdate ? pnlUpdate.completedTradePnl : 0;
        console.log(`  PNL found: $${pnl} (from ${pnlUpdate ? 'PNL update' : 'default'})`);
        
        const tradeData = currentTrade || { quantity: 6, points: 0 }; // Default values
        console.log(`  Current trade data: Quantity=${tradeData.quantity}, Points=${tradeData.points}`);

        // Count SL adjustments and near misses for this trade using ID
        const tradeId = tradeFill.id.split('_')[1]; // Extract just the ID number
        const slAdjustments = (rawData.match(new RegExp(`${tradeFill.date}.*(?:\\[TRADE SL \\(ID: ${tradeId}\\)\\]|SL Adjustment|Short position: Price reached X[12]|Long position: Price reached X[12])`, 'g')) || []).length;
        const nearMisses = (rawData.match(new RegExp(`${tradeFill.date}.*\\[(?:TP )?NEAR MISS \\(ID: ${tradeId}\\)\\]`, 'g')) || []).length;
        
        console.log(`  SL Adjustments: ${slAdjustments}, Near Misses: ${nearMisses} for trade ID ${tradeId}`);

        // Convert points to dollars
        const pointValue = 5;
        const maxProfitDollars = summary.maxProfit * pointValue;
        const maxLossDollars = summary.maxLoss * pointValue;

        const trade = {
          date: tradeFill.date,
          time: tradeFill.time,
          direction: tradeFill.direction,
          entry: tradeFill.entry,
          exit: summary.direction === 'LONG' ? summary.high : summary.low,
          pnl,
          maxProfit: maxProfitDollars,
          maxLoss: maxLossDollars,
          bars: summary.bars,
          line: summary.line,
          barsSinceLastTrade: tradeFill.barsSinceLastTrade,
          quantity: tradeData.quantity,
          points: tradeData.points,
          slAdjustments,
          nearMisses
        };
        
        console.log(`  Final trade object: PNL=$${trade.pnl}, Max Profit=$${trade.maxProfit}, Max Loss=$${trade.maxLoss}, Quantity=${trade.quantity}, Points=${trade.points}`);
        trades.push(trade);
      } else {
        console.log(`  No matching summary found for trade ID: ${tradeFill.id}`);
      }
    }

    console.log(`=== extractTradeData() END - Returning ${trades.length} trades ===`);
    return trades;
  }

  private calculateDailyPnl(tradeData: Array<{ date: string; pnl: number; bars: number }>): Array<{ date: string; pnl: number; trades: number }> {
    console.log('=== calculateDailyPnl() START ===');
    console.log(`Input trade data: ${tradeData.length} trades`);
    
    const dailyMap = new Map<string, { pnl: number; trades: number }>();

    for (const trade of tradeData) {
      console.log(`Processing trade: ${trade.date} - PNL: $${trade.pnl}`);
      const existing = dailyMap.get(trade.date) || { pnl: 0, trades: 0 };
      const newPnl = existing.pnl + (isFinite(trade.pnl) ? trade.pnl : 0);
      dailyMap.set(trade.date, {
        pnl: newPnl,
        trades: existing.trades + 1
      });
      console.log(`  Updated daily PNL for ${trade.date}: $${newPnl} (${existing.trades + 1} trades)`);
    }

    const result = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ 
        date, 
        pnl: isFinite(data.pnl) ? data.pnl : 0, 
        trades: data.trades 
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    console.log('Daily PNL summary:');
    result.forEach(day => {
      console.log(`  ${day.date}: $${day.pnl} (${day.trades} trades)`);
    });
    
    console.log(`=== calculateDailyPnl() END - Returning ${result.length} days ===`);
    return result;
  }

  private calculateMaxDrawdown(tradeData: Array<{ pnl: number }>): number {
    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;

    for (const trade of tradeData) {
      runningTotal += trade.pnl;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private extractCustomMetrics(rawData: string, tradeData: Array<{ pnl: number; maxProfit: number; maxLoss: number; bars: number; slAdjustments: number; nearMisses: number; quantity: number; points: number }>): Array<{ name: string; value: number; description?: string }> {
    const metrics: Array<{ name: string; value: number; description?: string }> = [];

    // Helper function to ensure finite numbers
    const ensureFinite = (value: number, defaultValue: number = 0): number => {
      return isFinite(value) ? value : defaultValue;
    };

    // Count near misses and SL adjustments from trade data
    const totalNearMisses = tradeData.reduce((sum, trade) => sum + trade.nearMisses, 0);
    const totalSlAdjustments = tradeData.reduce((sum, trade) => sum + trade.slAdjustments, 0);
    
    metrics.push({
      name: 'Near Misses',
      value: ensureFinite(totalNearMisses),
      description: 'Number of near miss trades'
    });

    metrics.push({
      name: 'SL Adjustments',
      value: ensureFinite(totalSlAdjustments),
      description: 'Number of stop loss adjustments made'
    });

    // Calculate average trade duration (in bars)
    const totalBars = tradeData.reduce((sum, trade) => sum + trade.bars, 0);
    const avgTradeDuration = tradeData.length > 0 ? totalBars / tradeData.length : 0;
    metrics.push({
      name: 'Average Trade Duration',
      value: ensureFinite(avgTradeDuration),
      description: 'Average trade duration in bars'
    });

    // Calculate average quantity and points
    const totalQuantity = tradeData.reduce((sum, trade) => sum + trade.quantity, 0);
    const avgQuantity = tradeData.length > 0 ? totalQuantity / tradeData.length : 0;
    metrics.push({
      name: 'Average Quantity',
      value: ensureFinite(avgQuantity),
      description: 'Average quantity per trade'
    });

    const totalPoints = tradeData.reduce((sum, trade) => sum + trade.points, 0);
    const avgPoints = tradeData.length > 0 ? totalPoints / tradeData.length : 0;
    metrics.push({
      name: 'Average Points',
      value: ensureFinite(avgPoints),
      description: 'Average points per trade'
    });

    // Calculate best and worst trades (only if we have trades)
    if (tradeData.length > 0) {
      const bestTrade = Math.max(...tradeData.map(t => t.pnl));
      const worstTrade = Math.min(...tradeData.map(t => t.pnl));
      
      metrics.push({
        name: 'Best Trade',
        value: ensureFinite(bestTrade),
        description: 'Best single trade P&L'
      });

      metrics.push({
        name: 'Worst Trade',
        value: ensureFinite(worstTrade),
        description: 'Worst single trade P&L'
      });

      // Count consecutive losses
      let maxConsecutiveLosses = 0;
      let currentConsecutiveLosses = 0;
      
      for (const trade of tradeData) {
        if (trade.pnl < 0) {
          currentConsecutiveLosses++;
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
        } else {
          currentConsecutiveLosses = 0;
        }
      }

      metrics.push({
        name: 'Max Consecutive Losses',
        value: ensureFinite(maxConsecutiveLosses),
        description: 'Maximum consecutive losing trades'
      });
    }

    return metrics;
  }
}
