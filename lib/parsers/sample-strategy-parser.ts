import { BaseStrategyParser, ParsedRunData } from './base-parser';

export class SampleStrategyParser extends BaseStrategyParser {
  strategyName = 'Sample Strategy';

  canParse(rawData: string): boolean {
    // Look for strategy name in the header
    return rawData.toLowerCase().includes('sample strategy') || 
           rawData.toLowerCase().includes('strategy: sample');
  }

  parse(rawData: string): ParsedRunData {
    const lines = rawData.split('\n');
    
    // Extract basic metrics
    const netPnl = this.extractNumber(rawData, /net pnl[:\s]+([+-]?\d+\.?\d*)/i) || 0;
    const totalTrades = this.extractNumber(rawData, /total trades[:\s]+(\d+)/i);
    const winRate = this.extractNumber(rawData, /win rate[:\s]+(\d+\.?\d*)%/i);
    const profitFactor = this.extractNumber(rawData, /profit factor[:\s]+(\d+\.?\d*)/i);
    const maxDrawdown = this.extractNumber(rawData, /max drawdown[:\s]+([+-]?\d+\.?\d*)/i);
    const sharpeRatio = this.extractNumber(rawData, /sharpe ratio[:\s]+(\d+\.?\d*)/i);

    // Extract run name if present
    const runName = this.extractString(rawData, /run[:\s]+(.+)/i);

    // Extract parameters (this is strategy-specific)
    const parameters = this.extractParameters(rawData);

    // Extract daily PNL
    const dailyPnl = this.extractDailyPnl(rawData);

    // Extract custom metrics specific to this strategy
    const customMetrics = this.extractCustomMetrics(rawData);

    return {
      strategyName: this.strategyName,
      runName,
      netPnl,
      totalTrades,
      winRate,
      profitFactor,
      maxDrawdown,
      sharpeRatio,
      dailyPnl,
      parameters,
      customMetrics
    };
  }

  private extractParameters(rawData: string): Array<{ name: string; value: string; type: 'string' | 'number' | 'boolean' | 'date' }> {
    const parameters: Array<{ name: string; value: string; type: 'string' | 'number' | 'boolean' | 'date' }> = [];
    
    // Look for parameter patterns - this is strategy-specific
    const paramPatterns = [
      { name: 'Period', pattern: /period[:\s]+(\d+)/i, type: 'number' as const },
      { name: 'Stop Loss', pattern: /stop loss[:\s]+(\d+\.?\d*)/i, type: 'number' as const },
      { name: 'Take Profit', pattern: /take profit[:\s]+(\d+\.?\d*)/i, type: 'number' as const },
      { name: 'Time Frame', pattern: /time frame[:\s]+(.+)/i, type: 'string' as const },
      { name: 'Enabled', pattern: /enabled[:\s]+(true|false)/i, type: 'boolean' as const },
    ];

    for (const param of paramPatterns) {
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

  private extractCustomMetrics(rawData: string): Array<{ name: string; value: number; description?: string }> {
    const metrics: Array<{ name: string; value: number; description?: string }> = [];
    
    // Look for custom metrics specific to this strategy
    const metricPatterns = [
      { name: 'Near Misses', pattern: /near misses[:\s]+(\d+)/i, description: 'Number of near miss trades' },
      { name: 'Average Trade Duration', pattern: /avg trade duration[:\s]+(\d+\.?\d*)/i, description: 'Average trade duration in minutes' },
      { name: 'Consecutive Losses', pattern: /consecutive losses[:\s]+(\d+)/i, description: 'Maximum consecutive losses' },
    ];

    for (const metric of metricPatterns) {
      const value = this.extractNumber(rawData, metric.pattern);
      if (value !== undefined) {
        metrics.push({
          name: metric.name,
          value,
          description: metric.description
        });
      }
    }

    return metrics;
  }
}
