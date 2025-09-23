import { BaseStrategyParser, ParsedRunData } from './base-parser';

export class MagicLinesScalperParser extends BaseStrategyParser {
  strategyName = 'MagicLinesScalper';

  canParse(rawData: string): boolean {
    return rawData.includes('MagicLinesScalper') || 
           rawData.includes('Magic Lines') ||
           rawData.includes('RTH Magic Lines');
  }

  parse(rawData: string): ParsedRunData {
    
    // Extract strategy name and run ID
    const strategyMatch = rawData.match(/Strategy '([^']+)'/);
    const strategyName = strategyMatch ? strategyMatch[1] : 'MagicLinesScalper';
    
    // Extract parameters from the detailed parameter section
    const parameters = this.extractParameters(rawData);
    
    // Extract trade data and calculate metrics
    const tradeData = this.extractTradeData(rawData);
    
    // Calculate daily PNL from trade summaries
    const dailyPnl = this.calculateDailyPnl(tradeData);
    
    // Calculate overall metrics from individual trades
    const totalTrades = tradeData.length;
    const netPnl = tradeData.reduce((sum, trade) => sum + trade.pnl, 0);
    const winningTrades = tradeData.filter(trade => trade.pnl > 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    
    
    
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

    // Extract detailed events and trade summaries
    const detailedEvents = this.extractDetailedEvents(rawData);
    const detailedTrades = this.extractDetailedTradeSummaries(rawData);

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
      customMetrics,
      detailedEvents,
      detailedTrades
    };
    
    
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
      { name: 'Early Finish', pattern: /Early Finish:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'Early Finish Time', pattern: /Early Finish:.*?Time:\s*(\d{2}:\d{2})/i, type: 'string' as const },
      { name: 'Early Finish Max Gain', pattern: /Early Finish:.*?Max Gain:\s*\$(\d+)/i, type: 'number' as const },
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
      { name: 'SL Levels - L1', pattern: /SL Levels - L1:\s*([+-]?\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'SL Levels - L2', pattern: /L2:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'SL High/Low Y1', pattern: /SL High\/Low Y1:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'SL High/Low Y2', pattern: /Y2:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'SL Time-Based', pattern: /SL Time-Based:\s*(\d+)\s*bars/i, type: 'number' as const },
      { name: 'Level L', pattern: /Level L:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'TP Adjustment', pattern: /TP Adjustment:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'TP X1', pattern: /TP Adjustment:.*?X1:\s*(\d+)\s*bars/i, type: 'number' as const },
      { name: 'TP X2', pattern: /TP Adjustment:.*?X2:\s*(\d+)\s*bars/i, type: 'number' as const },
      { name: 'TP Levels - L1', pattern: /TP Levels - L1:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'TP Levels - L2', pattern: /TP Levels - L2:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'Trim TP Near Miss', pattern: /Trim TP Near Miss:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'Trim Distance', pattern: /Trim TP Near Miss:.*?Distance:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
      { name: 'Trim Offset', pattern: /Trim TP Near Miss:.*?Offset:\s*(\d+(?:\.\d+)?)pts/i, type: 'number' as const },
    ];

    // Time parameters
    const timeParams = [
      { name: 'Start Time', pattern: /Start Time:\s*(\d{2}:\d{2})/i, type: 'string' as const },
      { name: 'End Time', pattern: /End Time:\s*(\d{2}:\d{2})/i, type: 'string' as const },
    ];

    // Protective functions parameters
    const protectiveParams = [
      { name: 'Trade Completion Protect', pattern: /Trade Completion Protect:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'Max Profit Delay', pattern: /Max Profit Delay:\s*(\d+)\s*bars/i, type: 'number' as const },
      { name: 'Max Loss Delay', pattern: /Max Loss Delay:\s*(\d+)\s*bars/i, type: 'number' as const },
    ];

    // Magic lines parameters
    const magicLinesParams = [
      { name: 'Upside Levels', pattern: /Upside Levels:\s*([\d.,\s]+)/i, type: 'string' as const },
      { name: 'Downside Levels', pattern: /Downside Levels:\s*([\d.,\s]+)/i, type: 'string' as const },
      { name: 'Morning Lines', pattern: /Morning Lines:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'Duration', pattern: /Morning Lines:.*?Duration:\s*(\d+)min/i, type: 'number' as const },
      { name: 'Morning Levels', pattern: /Morning Lines:.*?Levels:\s*([\d.,\s]+)/i, type: 'string' as const },
      { name: 'Mini Mode', pattern: /Mini Mode:\s*(True|False)/i, type: 'boolean' as const },
      { name: 'Instrument', pattern: /Instrument:\s*(\w+)/i, type: 'string' as const },
    ];

    // Extract all parameters
    const allParams = [...mainParams, ...entryParams, ...positionParams, ...timeParams, ...protectiveParams, ...magicLinesParams];
    
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
    // Handle both M/D/YYYY and YYYY-MM-DD date formats
    const tradeFillPattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[TRADE FILL \(ID: (\d+)\)\]\s+(LONG|SHORT)\s+FILLED:\s*([\d.]+)\s*\|\s*Bars Since Last Trade:\s*(\d+)/gi;
    
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
      const normalizedDate = this.normalizeDate(date);
      const tradeId = `${normalizedDate}_${id}`;
      tradeFills.push({
        date: normalizedDate,
        time,
        id: tradeId,
        direction: direction as 'LONG' | 'SHORT',
        entry: parseFloat(entryStr),
        barsSinceLastTrade: parseInt(barsSinceLastTradeStr)
      });
    }

    // Extract trade summaries - now with ID support
    // Handle both M/D/YYYY and YYYY-MM-DD date formats
    const tradeSummaryPattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[TRADE SUMMARY \(ID: (\d+)\)\]\s+(LONG|SHORT)\s*\|\s*Line:\s*([^|]+)\s*\|\s*Entry:\s*([\d.]+)\s*\|\s*High:\s*([\d.]+)\s*\|\s*Low:\s*([\d.]+)\s*\|\s*Max Profit:\s*([+-]?[\d.]+)pts\s*\|\s*Max Loss:\s*([+-]?[\d.]+)pts\s*\|\s*Bars:\s*(\d+)/gi;

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
      const normalizedDate = this.normalizeDate(date);
      const tradeId = `${normalizedDate}_${id}`;
      tradeSummaries.push({
        date: normalizedDate,
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
    }

    // Extract PNL updates - now with ID support
    // Handle both M/D/YYYY and YYYY-MM-DD date formats
    const pnlUpdatePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[PNL UPDATE \(ID: (\d+)\)\]\s+COMPLETED TRADE PnL:\s*\$([+-]?[\d.]+)\s*\|\s*Total PnL:\s*\$([+-]?[\d.]+)/gi;

    const pnlUpdates: Array<{
      date: string;
      time: string;
      id: string;
      completedTradePnl: number;
      totalPnl: number;
    }> = [];

    while ((match = pnlUpdatePattern.exec(rawData)) !== null) {
      const [, date, time, id, completedTradePnlStr, totalPnlStr] = match;
      const normalizedDate = this.normalizeDate(date);
      const tradeId = `${normalizedDate}_${id}`;
      pnlUpdates.push({
        date: normalizedDate,
        time,
        id: tradeId,
        completedTradePnl: parseFloat(completedTradePnlStr),
        totalPnl: parseFloat(totalPnlStr)
      });
    }

    // Extract additional trade data (quantity, points, etc.) - now with ID support
    // Handle both M/D/YYYY and YYYY-MM-DD date formats
    const currentTradePnlPattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[PNL UPDATE \(ID: (\d+)\)\]\s+CURRENT TRADE PnL:\s*\$([+-]?[\d.]+)\s*\|\s*Current PnL:\s*\$([+-]?[\d.]+)\s*\|\s*Points\s*:\s*([+-]?[\d.]+)\s*\|\s*Quantity:\s*(\d+)/gi;

    const currentTradeData: Array<{
      date: string;
      time: string;
      id: string;
      quantity: number;
      points: number;
    }> = [];

    while ((match = currentTradePnlPattern.exec(rawData)) !== null) {
      const [, date, time, id, , , pointsStr, quantityStr] = match;
      const normalizedDate = this.normalizeDate(date);
      const tradeId = `${normalizedDate}_${id}`;
      currentTradeData.push({
        date: normalizedDate,
        time,
        id: tradeId,
        quantity: parseInt(quantityStr),
        points: parseFloat(pointsStr)
      });
    }

    // Match all trade components together using IDs
    
    // Create lookup maps for faster matching
    const summaryMap = new Map<string, typeof tradeSummaries[0]>();
    const pnlMap = new Map<string, typeof pnlUpdates[0]>();
    const currentTradeMap = new Map<string, typeof currentTradeData[0]>();
    
    tradeSummaries.forEach(summary => summaryMap.set(summary.id, summary));
    pnlUpdates.forEach(pnl => pnlMap.set(pnl.id, pnl));
    currentTradeData.forEach(current => currentTradeMap.set(current.id, current));
    

    for (const tradeFill of tradeFills) {
      
      // Find components by ID
      const summary = summaryMap.get(tradeFill.id);
      const pnlUpdate = pnlMap.get(tradeFill.id);
      const currentTrade = currentTradeMap.get(tradeFill.id);

      if (summary) {
        
        const pnl = pnlUpdate ? pnlUpdate.completedTradePnl : 0;
        
        const tradeData = currentTrade || { quantity: 6, points: 0 }; // Default values

        // Count SL adjustments and near misses for this trade using ID
        const tradeId = tradeFill.id.split('_')[1]; // Extract just the ID number
        const slAdjustments = (rawData.match(new RegExp(`${tradeFill.date}.*(?:\\[TRADE SL \\(ID: ${tradeId}\\)\\]|SL Adjustment|Short position: Price reached X[12]|Long position: Price reached X[12])`, 'g')) || []).length;
        const nearMisses = (rawData.match(new RegExp(`${tradeFill.date}.*\\[(?:TP )?NEAR MISS \\(ID: ${tradeId}\\)\\]`, 'g')) || []).length;
        

        // Convert points to dollars
        const pointValue = 5;
        const maxProfitDollars = summary.maxProfit * pointValue;
        const maxLossDollars = summary.maxLoss * pointValue;

        // Normalize line name for better consistency
        const normalizedLine = this.normalizeLineName(summary.line);

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
          line: normalizedLine,
          barsSinceLastTrade: tradeFill.barsSinceLastTrade,
          quantity: tradeData.quantity,
          points: tradeData.points,
          slAdjustments,
          nearMisses
        };
        
        trades.push(trade);
      } else {
      }
    }

    return trades;
  }

  private calculateDailyPnl(tradeData: Array<{ date: string; pnl: number; bars: number }>): Array<{ date: string; pnl: number; trades: number; highestIntradayPnl?: number; lowestIntradayPnl?: number }> {
    
    const dailyMap = new Map<string, { 
      pnl: number; 
      trades: number; 
      highestIntradayPnl: number; 
      lowestIntradayPnl: number;
      runningPnl: number;
    }>();

    for (const trade of tradeData) {
      const existing = dailyMap.get(trade.date) || { 
        pnl: 0, 
        trades: 0, 
        highestIntradayPnl: 0, 
        lowestIntradayPnl: 0,
        runningPnl: 0
      };
      
      const tradePnl = isFinite(trade.pnl) ? trade.pnl : 0;
      const newRunningPnl = existing.runningPnl + tradePnl;
      const newPnl = existing.pnl + tradePnl;
      
      // Update intraday highs and lows
      const newHighest = Math.max(existing.highestIntradayPnl, newRunningPnl);
      const newLowest = Math.min(existing.lowestIntradayPnl, newRunningPnl);
      
      dailyMap.set(trade.date, {
        pnl: newPnl,
        trades: existing.trades + 1,
        highestIntradayPnl: newHighest,
        lowestIntradayPnl: newLowest,
        runningPnl: newRunningPnl
      });
    }

    const result = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ 
        date, 
        pnl: isFinite(data.pnl) ? data.pnl : 0, 
        trades: data.trades,
        highestIntradayPnl: isFinite(data.highestIntradayPnl) ? data.highestIntradayPnl : undefined,
        lowestIntradayPnl: isFinite(data.lowestIntradayPnl) ? data.lowestIntradayPnl : undefined
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    
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

  private extractCustomMetrics(rawData: string, tradeData: Array<{ pnl: number; maxProfit: number; maxLoss: number; bars: number; slAdjustments: number; nearMisses: number; quantity: number; points: number; line: string }>): Array<{ name: string; value: number; description?: string }> {
    const metrics: Array<{ name: string; value: number; description?: string }> = [];

    // Helper function to ensure finite numbers
    const ensureFinite = (value: number, defaultValue: number = 0): number => {
      return isFinite(value) ? value : defaultValue;
    };

    // Count different types of near misses
    const totalSlAdjustments = tradeData.reduce((sum, trade) => sum + trade.slAdjustments, 0);
    
    // Count TP Near Misses (associated with specific trades)
    const tpNearMisses = (rawData.match(/\[TP NEAR MISS \(ID: \d+\)\]/g) || []).length;
    
    // Count General Near Misses (not associated with specific trades)
    const generalNearMisses = (rawData.match(/\[NEAR MISS\]/g) || []).length;
    
    metrics.push({
      name: 'TP Near Misses',
      value: ensureFinite(tpNearMisses),
      description: 'Number of take profit near misses'
    });

    metrics.push({
      name: 'General Near Misses',
      value: ensureFinite(generalNearMisses),
      description: 'Number of general near misses'
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
      value: Math.round(ensureFinite(avgTradeDuration) * 100) / 100, // Round to 2 decimal places
      description: 'Average trade duration in bars'
    });

    // Calculate consecutive losses and wins (only if we have trades)
    if (tradeData.length > 0) {
      // Count consecutive losses and wins
      let maxConsecutiveLosses = 0;
      let maxConsecutiveWins = 0;
      let currentConsecutiveLosses = 0;
      let currentConsecutiveWins = 0;
      
      for (const trade of tradeData) {
        if (trade.pnl < 0) {
          currentConsecutiveLosses++;
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
          currentConsecutiveWins = 0;
        } else if (trade.pnl > 0) {
          currentConsecutiveWins++;
          maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutiveWins);
          currentConsecutiveLosses = 0;
        } else {
          // For break-even trades, reset both counters
          currentConsecutiveLosses = 0;
          currentConsecutiveWins = 0;
        }
      }

      metrics.push({
        name: 'Max Consecutive Losses',
        value: ensureFinite(maxConsecutiveLosses),
        description: 'Maximum consecutive losing trades'
      });

      metrics.push({
        name: 'Max Consecutive Wins',
        value: ensureFinite(maxConsecutiveWins),
        description: 'Maximum consecutive winning trades'
      });
    }

    // Calculate line-specific statistics
    const lineStats = this.calculateLineStatistics(tradeData);
    
    // Add line-specific metrics to the main metrics array
    for (const [lineName, stats] of lineStats.entries()) {
      metrics.push({
        name: `${lineName} - Total Trades`,
        value: ensureFinite(stats.totalTrades),
        description: `Total trades executed on ${lineName}`
      });

      metrics.push({
        name: `${lineName} - Win Rate`,
        value: ensureFinite(stats.winRate),
        description: `Win rate for trades on ${lineName}`
      });

      metrics.push({
        name: `${lineName} - Net PNL`,
        value: ensureFinite(stats.netPnl),
        description: `Net P&L for trades on ${lineName}`
      });

      metrics.push({
        name: `${lineName} - Avg PNL`,
        value: ensureFinite(stats.avgPnl),
        description: `Average P&L per trade on ${lineName}`
      });

      metrics.push({
        name: `${lineName} - Gross Profit`,
        value: ensureFinite(stats.grossProfit),
        description: `Total profit from winning trades on ${lineName}`
      });

      metrics.push({
        name: `${lineName} - Gross Loss`,
        value: ensureFinite(stats.grossLoss),
        description: `Total loss from losing trades on ${lineName}`
      });

      // Calculate profit factor for this line
      const profitFactor = stats.grossLoss > 0 ? stats.grossProfit / stats.grossLoss : 0;
      metrics.push({
        name: `${lineName} - Profit Factor`,
        value: Math.round(ensureFinite(profitFactor) * 100) / 100, // Round to 2 decimal places
        description: `Profit factor for trades on ${lineName}`
      });
    }

    return metrics;
  }

  private calculateLineStatistics(tradeData: Array<{ pnl: number; line: string }>): Map<string, { 
    totalTrades: number; 
    winningTrades: number; 
    losingTrades: number; 
    winRate: number; 
    netPnl: number; 
    avgPnl: number;
    grossProfit: number;
    grossLoss: number;
  }> {
    const lineStatsMap = new Map<string, { 
      totalTrades: number; 
      winningTrades: number; 
      losingTrades: number; 
      winRate: number; 
      netPnl: number; 
      avgPnl: number;
      grossProfit: number;
      grossLoss: number;
    }>();

    // Group trades by line
    for (const trade of tradeData) {
      const lineName = trade.line;
      
      if (!lineStatsMap.has(lineName)) {
        lineStatsMap.set(lineName, {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          netPnl: 0,
          avgPnl: 0,
          grossProfit: 0,
          grossLoss: 0
        });
      }

      const stats = lineStatsMap.get(lineName)!;
      stats.totalTrades++;
      stats.netPnl += trade.pnl;

      if (trade.pnl > 0) {
        stats.winningTrades++;
        stats.grossProfit += trade.pnl;
      } else if (trade.pnl < 0) {
        stats.losingTrades++;
        stats.grossLoss += Math.abs(trade.pnl);
      }
    }

    // Calculate derived metrics
    for (const [lineName, stats] of lineStatsMap.entries()) {
      stats.winRate = stats.totalTrades > 0 ? Math.round((stats.winningTrades / stats.totalTrades) * 10000) / 10000 : 0; // Round to 4 decimal places
      stats.avgPnl = stats.totalTrades > 0 ? Math.round((stats.netPnl / stats.totalTrades) * 100) / 100 : 0; // Round to 2 decimal places
      stats.netPnl = Math.round(stats.netPnl * 100) / 100; // Round to 2 decimal places
      stats.grossProfit = Math.round(stats.grossProfit * 100) / 100; // Round to 2 decimal places
      stats.grossLoss = Math.round(stats.grossLoss * 100) / 100; // Round to 2 decimal places
    }

    return lineStatsMap;
  }

  private normalizeLineName(lineName: string): string {
    // Clean up the line name by removing extra spaces and standardizing format
    return lineName.trim().replace(/\s+/g, ' ');
  }

  private normalizeDate(dateStr: string): string {
    // Handle both M/D/YYYY and YYYY-MM-DD formats
    if (dateStr.includes('/')) {
      // M/D/YYYY format - convert to YYYY-MM-DD
      const [month, day, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else if (dateStr.includes('-')) {
      // YYYY-MM-DD format - already normalized
      return dateStr;
    }
    // Fallback - return as-is if format is unrecognized
    return dateStr;
  }

  private extractDetailedEvents(rawData: string): {
    tpNearMisses: Array<{
      date: string;
      time: string;
      tradeId: string;
      direction: string;
      target: string;
      closestDistance: string;
      reason: string;
    }>;
    fillNearMisses: Array<{
      date: string;
      time: string;
      direction: string;
      closestDistance: string;
    }>;
    slAdjustments: Array<{
      date: string;
      time: string;
      tradeId: string;
      direction: string;
      trigger: string;
      adjustment: string;
    }>;
  } {
    const events = {
      tpNearMisses: [] as Array<{
        date: string;
        time: string;
        tradeId: string;
        direction: string;
        target: string;
        closestDistance: string;
        reason: string;
      }>,
      fillNearMisses: [] as Array<{
        date: string;
        time: string;
        direction: string;
        closestDistance: string;
      }>,
      slAdjustments: [] as Array<{
        date: string;
        time: string;
        tradeId: string;
        direction: string;
        trigger: string;
        adjustment: string;
      }>
    };

    // Extract TP Near Misses
    // Handle both M/D/YYYY and YYYY-MM-DD date formats
    const tpNearMissPattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[TP NEAR MISS \(ID: (\d+)\)\]\s+(Long|Short)\s+TP near miss \(([^)]+)\) at ([^-]+) - closest distance: ([\d.]+)pts \(([^)]+)\)/g;
    let match;
    while ((match = tpNearMissPattern.exec(rawData)) !== null) {
      const [, date, time, tradeId, direction, target, , closestDistance, reason] = match;
      events.tpNearMisses.push({
        date: this.normalizeDate(date),
        time,
        tradeId,
        direction,
        target,
        closestDistance,
        reason
      });
    }

    // Extract Fill Near Misses (general near misses)
    // Handle both M/D/YYYY and YYYY-MM-DD date formats
    const fillNearMissPattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[NEAR MISS\]\s+(Long|Short)\s+near miss at ([^-]+) - closest distance: ([\d.]+)pts/g;
    while ((match = fillNearMissPattern.exec(rawData)) !== null) {
      const [, date, time, direction, closestDistance] = match;
      events.fillNearMisses.push({
        date: this.normalizeDate(date),
        time,
        direction,
        closestDistance
      });
    }

    // Extract SL Adjustments
    // Handle both M/D/YYYY and YYYY-MM-DD date formats
    const slAdjustmentPattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[TRADE SL \(ID: (\d+)\)\]\s+(Long|Short)\s+position: Price reached (X[12]) \(([^)]+)\), adjusting SL to (L[12]) \(([^)]+)\)/g;
    while ((match = slAdjustmentPattern.exec(rawData)) !== null) {
      const [, date, time, tradeId, direction, trigger, triggerValue, adjustment, adjustmentValue] = match;
      events.slAdjustments.push({
        date: this.normalizeDate(date),
        time,
        tradeId,
        direction,
        trigger: `${trigger} (${triggerValue})`,
        adjustment: `${adjustment} (${adjustmentValue})`
      });
    }

    return events;
  }

  private extractDetailedTradeSummaries(rawData: string): Array<{
    date: string;
    time: string;
    tradeId: string;
    direction: 'LONG' | 'SHORT';
    line: string;
    entry: number;
    high: number;
    low: number;
    maxProfit: number;
    maxLoss: number;
    actualPnl: number;
    bars: number;
    // Analysis fields
    maxProfitVsTarget: number; // How far max profit was from TP target
    maxLossVsStop: number; // How far max loss was from SL target
    profitEfficiency: number; // Actual PNL vs max profit achieved
  }> {
    const trades = [];

    // Extract trade summaries with detailed analysis - fixed case sensitivity
    // Handle both M/D/YYYY and YYYY-MM-DD date formats
    const tradeSummaryPattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+\[TRADE SUMMARY \(ID: (\d+)\)\]\s+(Long|Short)\s*\|\s*Line:\s*([^|]+)\s*\|\s*Entry:\s*([\d.]+)\s*\|\s*High:\s*([\d.]+)\s*\|\s*Low:\s*([\d.]+)\s*\|\s*Max Profit:\s*([+-]?[\d.]+)pts\s*\|\s*Max Loss:\s*([+-]?[\d.]+)pts\s*\|\s*Bars:\s*(\d+)/g;
    
    let match;
    while ((match = tradeSummaryPattern.exec(rawData)) !== null) {
      const [, date, time, tradeId, direction, line, entryStr, highStr, lowStr, maxProfitStr, maxLossStr, barsStr] = match;
      const normalizedDate = this.normalizeDate(date);
      
      // Get actual PNL for this trade
      const pnlPattern = new RegExp(`${date}.*\\[PNL UPDATE \\(ID: ${tradeId}\\)\\].*COMPLETED TRADE PnL: \\$([+-]?[\\d.]+)`, 'g');
      const pnlMatch = pnlPattern.exec(rawData);
      const actualPnl = pnlMatch ? parseFloat(pnlMatch[1]) : 0;

      // Get TP and SL targets from parameters (assuming 17pts for both)
      const tpTarget = 17; // Full Take Profit from parameters
      const slTarget = 17; // Full Stop Loss from parameters

      const entry = parseFloat(entryStr);
      const high = parseFloat(highStr);
      const low = parseFloat(lowStr);
      const maxProfit = parseFloat(maxProfitStr);
      const maxLoss = parseFloat(maxLossStr);
      const bars = parseInt(barsStr);

      // Calculate analysis metrics
      const maxProfitVsTarget = maxProfit - tpTarget; // How much more profit could have been made
      const maxLossVsStop = Math.abs(maxLoss) - slTarget; // How much more loss was taken than stop
      const profitEfficiency = maxProfit > 0 ? (actualPnl / (maxProfit * 5)) : 0; // 5 is point value

      trades.push({
        date: normalizedDate,
        time,
        tradeId,
        direction: direction as 'LONG' | 'SHORT',
        line: line.trim(),
        entry,
        high,
        low,
        maxProfit,
        maxLoss,
        actualPnl,
        bars,
        maxProfitVsTarget,
        maxLossVsStop,
        profitEfficiency
      });
    }


    return trades;
  }
}
