import { BaseStrategyParser, ParsedRunData } from './base-parser';

export class MagicLinesScalperParser extends BaseStrategyParser {
  strategyName = 'MagicLinesScalper';

  canParse(rawData: string): boolean {
    return rawData.includes('MagicLinesScalper') || 
           rawData.includes('Magic Lines') ||
           rawData.includes('RTH Magic Lines');
  }

  parse(rawData: string): ParsedRunData {
    const lines = rawData.split('\n');
    
    // Extract strategy name and run ID
    const strategyMatch = rawData.match(/Strategy '([^']+)'/);
    const strategyName = strategyMatch ? strategyMatch[1] : 'MagicLinesScalper';
    
    // Extract parameters from the detailed parameter section
    const parameters = this.extractParameters(rawData);
    
    // Extract trade data and calculate metrics
    const tradeData = this.extractTradeData(rawData);
    
    // Calculate daily PNL from trade summaries
    const dailyPnl = this.calculateDailyPnl(tradeData);
    
    // Calculate overall metrics
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

    return {
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
    direction: 'LONG' | 'SHORT';
    entry: number;
    exit: number;
    pnl: number;
    maxProfit: number;
    maxLoss: number;
    bars: number;
    line: string;
  }> {
    const trades: Array<{
      date: string;
      direction: 'LONG' | 'SHORT';
      entry: number;
      exit: number;
      pnl: number;
      maxProfit: number;
      maxLoss: number;
      bars: number;
      line: string;
    }> = [];

    // Match trade summary lines - more flexible pattern
    const tradeSummaryPattern = /(\d{4}-\d{2}-\d{2})\s+\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM)\s+\[TRADE SUMMARY\]\s+(LONG|SHORT)\s*\|\s*Line:\s*([^|]+)\s*\|\s*Entry:\s*([\d.]+)\s*\|\s*High:\s*([\d.]+)\s*\|\s*Low:\s*([\d.]+)\s*\|\s*Max Profit:\s*([+-]?[\d.]+)pts\s*\|\s*Max Loss:\s*([+-]?[\d.]+)pts\s*\|\s*Bars:\s*(\d+)/g;

    let match;
    while ((match = tradeSummaryPattern.exec(rawData)) !== null) {
      const [, date, direction, line, entryStr, highStr, lowStr, maxProfitStr, maxLossStr, barsStr] = match;
      
      const entry = parseFloat(entryStr);
      const high = parseFloat(highStr);
      const low = parseFloat(lowStr);
      const maxProfit = parseFloat(maxProfitStr);
      const maxLoss = parseFloat(maxLossStr);
      const bars = parseInt(barsStr);
      
      // Calculate PNL based on direction and price movement
      let pnl = 0;
      if (direction === 'LONG') {
        pnl = high - entry; // Use high for long trades
      } else {
        pnl = entry - low; // Use low for short trades
      }
      
      // Convert points to dollars (assuming $5 per point for MNQ)
      const pointValue = 5;
      pnl *= pointValue;
      const maxProfitDollars = maxProfit * pointValue;
      const maxLossDollars = maxLoss * pointValue;

      trades.push({
        date,
        direction: direction as 'LONG' | 'SHORT',
        entry,
        exit: direction === 'LONG' ? high : low,
        pnl,
        maxProfit: maxProfitDollars,
        maxLoss: maxLossDollars,
        bars,
        line: line.trim()
      });
    }

    return trades;
  }

  private calculateDailyPnl(tradeData: Array<{ date: string; pnl: number; bars: number }>): Array<{ date: string; pnl: number; trades: number }> {
    const dailyMap = new Map<string, { pnl: number; trades: number }>();

    for (const trade of tradeData) {
      const existing = dailyMap.get(trade.date) || { pnl: 0, trades: 0 };
      dailyMap.set(trade.date, {
        pnl: existing.pnl + (isFinite(trade.pnl) ? trade.pnl : 0),
        trades: existing.trades + 1
      });
    }

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({ 
        date, 
        pnl: isFinite(data.pnl) ? data.pnl : 0, 
        trades: data.trades 
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
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

  private extractCustomMetrics(rawData: string, tradeData: Array<{ pnl: number; maxProfit: number; maxLoss: number }>): Array<{ name: string; value: number; description?: string }> {
    const metrics: Array<{ name: string; value: number; description?: string }> = [];

    // Helper function to ensure finite numbers
    const ensureFinite = (value: number, defaultValue: number = 0): number => {
      return isFinite(value) ? value : defaultValue;
    };

    // Count near misses
    const nearMissMatches = rawData.match(/\[(?:TP )?NEAR MISS\]/g);
    const nearMissCount = nearMissMatches ? nearMissMatches.length : 0;
    metrics.push({
      name: 'Near Misses',
      value: ensureFinite(nearMissCount),
      description: 'Number of near miss trades'
    });

    // Count SL adjustments
    const slAdjustmentMatches = rawData.match(/SL Adjustment:/g);
    const slAdjustmentCount = slAdjustmentMatches ? slAdjustmentMatches.length : 0;
    metrics.push({
      name: 'SL Adjustments',
      value: ensureFinite(slAdjustmentCount),
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
