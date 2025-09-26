import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { parserRegistry } from '@/lib/parsers/parser-registry';
import '@/lib/init-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
) {
  try {
    const { id, date } = await params;
    const runId = parseInt(id);

    if (isNaN(runId)) {
      return NextResponse.json(
        { error: 'Invalid run ID' },
        { status: 400 }
      );
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Fetch raw data for the specific run
    const result = await db.execute({
      sql: `
        SELECT raw_data, run_name, run_description, created_at
        FROM strategy_runs 
        WHERE id = ?
      `,
      args: [runId]
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    const run = result.rows[0] as {
      raw_data: string | null;
      run_name: string | null;
      run_description: string | null;
      created_at: string;
    };

    if (!run.raw_data) {
      return NextResponse.json(
        { error: 'No raw data available for this run' },
        { status: 404 }
      );
    }

    // Parse the raw data to extract date-specific information
    const parsedData = parserRegistry.parseRawData(run.raw_data);
    
    if (!parsedData) {
      return NextResponse.json(
        { error: 'Unable to parse raw data' },
        { status: 500 }
      );
    }

    // Extract date-specific data
    const dateSpecificData = extractDateSpecificData(run.raw_data, date, parsedData);

    return NextResponse.json({
      success: true,
      date,
      runName: run.run_name,
      runDescription: run.run_description,
      createdAt: run.created_at,
      dateSpecificRawData: dateSpecificData.rawLines,
      trades: dateSpecificData.trades,
      events: dateSpecificData.events,
      summary: dateSpecificData.summary
    });

  } catch (error) {
    console.error('Error fetching date-specific raw data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch date-specific raw data' },
      { status: 500 }
    );
  }
}

interface DateSpecificData {
  rawLines: string[];
  trades: any[];
  events: any[];
  summary: {
    totalTrades: number;
    totalPnl: number;
    winningTrades: number;
    losingTrades: number;
  };
}

function extractDateSpecificData(rawData: string, targetDate: string, parsedData: any): DateSpecificData {
  const lines = rawData.split('\n');
  const dateSpecificLines: string[] = [];
  const trades: any[] = [];
  const events: any[] = [];
  
  let totalPnl = 0;
  let totalTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;

  // Convert target date to various formats that might appear in raw data
  const targetDateObj = new Date(targetDate);
  const targetDateFormats = [
    targetDate, // YYYY-MM-DD
    targetDate.replace(/-/g, '/'), // YYYY/MM/DD
    `${targetDateObj.getMonth() + 1}/${targetDateObj.getDate()}/${targetDateObj.getFullYear()}`, // M/D/YYYY
    `${String(targetDateObj.getMonth() + 1).padStart(2, '0')}/${String(targetDateObj.getDate()).padStart(2, '0')}/${targetDateObj.getFullYear()}`, // MM/DD/YYYY
    `${targetDateObj.getDate()}/${targetDateObj.getMonth() + 1}/${targetDateObj.getFullYear()}`, // D/M/YYYY
    `${String(targetDateObj.getDate()).padStart(2, '0')}/${String(targetDateObj.getMonth() + 1).padStart(2, '0')}/${targetDateObj.getFullYear()}`, // DD/MM/YYYY
  ];

  // Also check for partial date matches (just month/day without year)
  const monthDayFormats = [
    `${targetDateObj.getMonth() + 1}/${targetDateObj.getDate()}`, // M/D
    `${String(targetDateObj.getMonth() + 1).padStart(2, '0')}/${String(targetDateObj.getDate()).padStart(2, '0')}`, // MM/DD
    `${targetDateObj.getDate()}/${targetDateObj.getMonth() + 1}`, // D/M
    `${String(targetDateObj.getDate()).padStart(2, '0')}/${String(targetDateObj.getMonth() + 1).padStart(2, '0')}`, // DD/MM
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for exact date matches first
    const isExactDateMatch = targetDateFormats.some(dateFormat => 
      trimmedLine.startsWith(dateFormat) || 
      trimmedLine.includes(` ${dateFormat} `) ||
      trimmedLine.includes(` ${dateFormat}`) ||
      trimmedLine.includes(`${dateFormat} `)
    );

    // Check for partial date matches (month/day only)
    const isPartialDateMatch = monthDayFormats.some(dateFormat => 
      trimmedLine.includes(dateFormat) && 
      (trimmedLine.includes('AM') || trimmedLine.includes('PM') || trimmedLine.includes('['))
    );

    if (isExactDateMatch || isPartialDateMatch) {
      dateSpecificLines.push(trimmedLine);

      // Extract trade information
      if (trimmedLine.includes('TRADE SUMMARY') || trimmedLine.includes('LONG') || trimmedLine.includes('SHORT')) {
        const tradeMatch = trimmedLine.match(/(LONG|SHORT).*?Entry:\s*([\d.]+).*?Max Profit:\s*([\d.]+)pts.*?Max Loss:\s*([\d.]+)pts/);
        if (tradeMatch) {
          const direction = tradeMatch[1];
          const entry = parseFloat(tradeMatch[2]);
          const maxProfit = parseFloat(tradeMatch[3]);
          const maxLoss = parseFloat(tradeMatch[4]);
          
          trades.push({
            direction,
            entry,
            maxProfit,
            maxLoss,
            line: trimmedLine
          });
          
          totalTrades++;
        }
      }

      // Extract PNL information
      if (trimmedLine.includes('PNL UPDATE') || trimmedLine.includes('COMPLETED TRADE PnL')) {
        const pnlMatch = trimmedLine.match(/\$?(-?\d+\.?\d*)/g);
        if (pnlMatch) {
          // Get the last PNL value in the line
          const pnl = parseFloat(pnlMatch[pnlMatch.length - 1].replace('$', ''));
          if (!isNaN(pnl)) {
            totalPnl += pnl;
            if (pnl > 0) winningTrades++;
            if (pnl < 0) losingTrades++;
          }
        }
      }

      // Extract event information
      if (trimmedLine.includes('SL Adjustment') || 
          trimmedLine.includes('TP Near Miss') || 
          trimmedLine.includes('Fill Near Miss') ||
          trimmedLine.includes('TRADE COMPLETION') ||
          trimmedLine.includes('TRIM TP NEAR MISS')) {
        
        let eventType = 'Other';
        if (trimmedLine.includes('SL Adjustment')) eventType = 'SL Adjustment';
        else if (trimmedLine.includes('TP Near Miss') || trimmedLine.includes('TRIM TP NEAR MISS')) eventType = 'TP Near Miss';
        else if (trimmedLine.includes('Fill Near Miss')) eventType = 'Fill Near Miss';
        else if (trimmedLine.includes('TRADE COMPLETION')) eventType = 'Trade Completion';

        events.push({
          type: eventType,
          line: trimmedLine
        });
      }
    }
  }

  // If no specific date lines found, try to find daily summary for that date
  if (dateSpecificLines.length === 0) {
    // Look for daily PnL summary lines
    const dailyPnlFromParsed = parsedData.dailyPnl?.find((d: any) => d.date === targetDate);
    if (dailyPnlFromParsed) {
      dateSpecificLines.push(`Daily Summary for ${targetDate}: PnL: $${dailyPnlFromParsed.pnl}, Trades: ${dailyPnlFromParsed.trades || 0}`);
      totalPnl = dailyPnlFromParsed.pnl;
      totalTrades = dailyPnlFromParsed.trades || 0;
    }
  }

  return {
    rawLines: dateSpecificLines,
    trades,
    events,
    summary: {
      totalTrades,
      totalPnl,
      winningTrades,
      losingTrades
    }
  };
}
