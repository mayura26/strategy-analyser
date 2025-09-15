import { BaseStrategyParser, ParsedRunData } from './base-parser';
import { SampleStrategyParser } from './sample-strategy-parser';
import { MagicLinesScalperParser } from './magic-lines-scalper-parser';

export class ParserRegistry {
  private parsers: BaseStrategyParser[] = [];

  constructor() {
    // Register all available parsers
    this.registerParser(new MagicLinesScalperParser());
    this.registerParser(new SampleStrategyParser());
  }

  registerParser(parser: BaseStrategyParser): void {
    this.parsers.push(parser);
  }

  parseRawData(rawData: string): ParsedRunData | null {
    for (const parser of this.parsers) {
      if (parser.canParse(rawData)) {
        try {
          return parser.parse(rawData);
        } catch (error) {
          console.error(`Error parsing with ${parser.strategyName} parser:`, error);
          return null;
        }
      }
    }
    
    console.warn('No parser found for the provided raw data');
    return null;
  }

  getAvailableStrategies(): string[] {
    return this.parsers.map(parser => parser.strategyName);
  }

  getParserForStrategy(strategyName: string): BaseStrategyParser | null {
    return this.parsers.find(parser => parser.strategyName === strategyName) || null;
  }
}

// Singleton instance
export const parserRegistry = new ParserRegistry();
