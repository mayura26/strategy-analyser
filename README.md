# Strategy Analyzer

A Next.js application for analyzing and comparing NinjaTrader strategy performance. Parse raw strategy data, extract metrics and parameters, and compare different runs to optimize your trading strategies.

## Features

- **Raw Data Parsing**: Automatically parse raw text output from NinjaTrader strategies
- **Flexible Database**: Store strategy runs, parameters, and custom metrics in a flexible schema
- **Strategy-Specific Parsers**: Extensible parser system for different strategy types
- **Performance Comparison**: Compare multiple strategy runs side-by-side
- **Visual Analytics**: Interactive charts for daily PNL and performance metrics
- **Parameter Tracking**: Track and compare strategy parameters across runs

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Charts**: Recharts
- **Database**: Turso (SQLite-compatible)
- **Icons**: Lucide React

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   Create a `.env.local` file:
   ```env
   DATABASE_URL=file:./strategy_analyser.db
   DATABASE_AUTH_TOKEN=your_turso_token_here
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Upload Raw Data
- Go to the "Upload Data" page
- Paste your raw NinjaTrader strategy output
- The system will automatically detect the strategy type and parse the data

### 2. View Analysis
- Go to the "Analysis" page
- Select a strategy to view all runs
- Compare different runs to identify performance patterns
- View daily PNL charts and parameter differences

## Database Schema

The system uses a flexible database schema that can accommodate different strategy types:

- **strategies**: Strategy metadata and information
- **strategy_runs**: Individual run results with core metrics
- **daily_pnl**: Daily performance breakdown for each run
- **strategy_parameters**: Flexible parameter storage (string, number, boolean, date)
- **strategy_metrics**: Custom metrics specific to each strategy type

## Adding New Strategy Parsers

To add support for a new strategy type:

1. Create a new parser class extending `BaseStrategyParser`
2. Implement the `canParse()` and `parse()` methods
3. Register the parser in `ParserRegistry`
4. Define strategy-specific parameter and metric extraction patterns

Example:
```typescript
export class MyStrategyParser extends BaseStrategyParser {
  strategyName = 'My Strategy';
  
  canParse(rawData: string): boolean {
    return rawData.includes('My Strategy');
  }
  
  parse(rawData: string): ParsedRunData {
    // Implementation here
  }
}
```

## Sample Data Format

The system expects raw text data with the following structure:
- Strategy name in the header
- Performance metrics (Net PNL, Total Trades, Win Rate, etc.)
- Daily PNL breakdown
- Strategy parameters
- Custom metrics (strategy-specific)

See `sample-data.txt` for an example format.

## API Endpoints

- `POST /api/parse` - Parse and store raw strategy data
- `GET /api/strategies` - Get all strategies with summary stats
- `GET /api/runs` - Get strategy runs (optionally filtered by strategy)
- `GET /api/runs/[id]/daily-pnl` - Get daily PNL for a specific run
- `GET /api/runs/[id]/parameters` - Get parameters for a specific run

## Development

The project uses:
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for consistent UI components
- Recharts for data visualization
- Turso for database storage

## License

MIT License