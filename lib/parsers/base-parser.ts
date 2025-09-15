export interface ParsedRunData {
  strategyName: string;
  runName?: string;
  runDescription?: string;
  netPnl: number;
  totalTrades?: number;
  winRate?: number;
  profitFactor?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  dailyPnl: Array<{
    date: string;
    pnl: number;
    trades?: number;
  }>;
  parameters: Array<{
    name: string;
    value: string;
    type: 'string' | 'number' | 'boolean' | 'date';
  }>;
  customMetrics: Array<{
    name: string;
    value: number;
    description?: string;
  }>;
  detailedEvents?: {
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
  };
  detailedTrades?: Array<{
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
    maxProfitVsTarget: number;
    maxLossVsStop: number;
    profitEfficiency: number;
  }>;
}

export abstract class BaseStrategyParser {
  abstract strategyName: string;
  abstract canParse(rawData: string): boolean;
  abstract parse(rawData: string): ParsedRunData;

  protected extractNumber(text: string, pattern: RegExp): number | undefined {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(value) ? undefined : value;
    }
    return undefined;
  }

  protected extractString(text: string, pattern: RegExp): string | undefined {
    const match = text.match(pattern);
    return match ? match[1].trim() : undefined;
  }

  protected parseDate(dateStr: string): string {
    // Try to parse various date formats and return YYYY-MM-DD
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr; // Return as-is if can't parse
    }
    return date.toISOString().split('T')[0];
  }

  protected extractDailyPnl(text: string): Array<{ date: string; pnl: number; trades?: number }> {
    // This is a base implementation - strategy-specific parsers should override
    const dailyPnl: Array<{ date: string; pnl: number; trades?: number }> = [];
    
    // Look for common daily PNL patterns
    const dailyPattern = /(\d{4}-\d{2}-\d{2})[:\s]+([+-]?\d+\.?\d*)/g;
    let match;
    
    while ((match = dailyPattern.exec(text)) !== null) {
      const date = match[1];
      const pnl = parseFloat(match[2]);
      if (!isNaN(pnl)) {
        dailyPnl.push({ date, pnl });
      }
    }
    
    return dailyPnl;
  }
}
