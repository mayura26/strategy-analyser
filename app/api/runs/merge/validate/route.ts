import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { runIds } = await request.json();

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

    // Check if all runs exist and belong to the same strategy
    const runsResult = await db.execute({
      sql: `
        SELECT 
          sr.id,
          sr.strategy_id,
          sr.run_name,
          sr.run_description,
          s.name as strategy_name
        FROM strategy_runs sr
        JOIN strategies s ON sr.strategy_id = s.id
        WHERE sr.id IN (${validRunIds.map(() => '?').join(',')})
        ORDER BY sr.id
      `,
      args: validRunIds
    });

    if (runsResult.rows.length !== validRunIds.length) {
      return NextResponse.json(
        { error: 'One or more runs not found' },
        { status: 404 }
      );
    }

    // Check if all runs belong to the same strategy
    const strategyIds = [...new Set(runsResult.rows.map((row: any) => row.strategy_id))];
    if (strategyIds.length > 1) {
      return NextResponse.json(
        { 
          error: 'Cannot merge runs from different strategies',
          details: {
            runs: runsResult.rows.map((row: any) => ({
              id: row.id,
              name: row.run_name,
              strategy: row.strategy_name
            }))
          }
        },
        { status: 400 }
      );
    }

    // Get date ranges for all runs
    const dateRangesResult = await db.execute({
      sql: `
        SELECT 
          run_id,
          MIN(date) as start_date,
          MAX(date) as end_date
        FROM daily_pnl
        WHERE run_id IN (${validRunIds.map(() => '?').join(',')})
        GROUP BY run_id
        ORDER BY run_id
      `,
      args: validRunIds
    });

    const dateRanges = dateRangesResult.rows.map((row: any) => ({
      runId: row.run_id,
      startDate: row.start_date,
      endDate: row.end_date
    }));

    // Check for date overlaps
    const overlaps: Array<{run1: number, run2: number, overlap: string}> = [];
    for (let i = 0; i < dateRanges.length; i++) {
      for (let j = i + 1; j < dateRanges.length; j++) {
        const range1 = dateRanges[i];
        const range2 = dateRanges[j];
        
        // Check if date ranges overlap
        if (range1.startDate <= range2.endDate && range2.startDate <= range1.endDate) {
          const overlapStart = range1.startDate > range2.startDate ? range1.startDate : range2.startDate;
          const overlapEnd = range1.endDate < range2.endDate ? range1.endDate : range2.endDate;
          overlaps.push({
            run1: range1.runId,
            run2: range2.runId,
            overlap: `${overlapStart} to ${overlapEnd}`
          });
        }
      }
    }

    if (overlaps.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot merge runs with overlapping date ranges',
          details: {
            overlaps,
            runs: runsResult.rows.map((row: any) => ({
              id: row.id,
              name: row.run_name,
              dateRange: dateRanges.find((dr: any) => dr.runId === row.id)
            }))
          }
        },
        { status: 400 }
      );
    }

    // Get parameters for all runs
    const parametersResult = await db.execute({
      sql: `
        SELECT 
          run_id,
          parameter_name,
          parameter_value,
          parameter_type
        FROM strategy_parameters
        WHERE run_id IN (${validRunIds.map(() => '?').join(',')})
        ORDER BY run_id, parameter_name
      `,
      args: validRunIds
    });

    // Group parameters by run
    const parametersByRun: { [runId: number]: Array<{name: string, value: string, type: string}> } = {};
    parametersResult.rows.forEach((row: any) => {
      if (!parametersByRun[row.run_id]) {
        parametersByRun[row.run_id] = [];
      }
      parametersByRun[row.run_id].push({
        name: row.parameter_name,
        value: row.parameter_value,
        type: row.parameter_type
      });
    });

    // Check if all runs have the same parameters
    const parameterDifferences: Array<{parameter: string, differences: Array<{runId: number, value: string}>}> = [];
    const allParameterNames = new Set<string>();
    
    // Collect all parameter names
    Object.values(parametersByRun).forEach(params => {
      params.forEach(param => allParameterNames.add(param.name));
    });

    // Check each parameter across all runs
    allParameterNames.forEach(paramName => {
      const valuesByRun: Array<{runId: number, value: string}> = [];
      
      validRunIds.forEach(runId => {
        const runParams = parametersByRun[runId] || [];
        const param = runParams.find(p => p.name === paramName);
        valuesByRun.push({
          runId,
          value: param ? param.value : 'MISSING'
        });
      });

      // Check if all values are the same
      const uniqueValues = [...new Set(valuesByRun.map(v => v.value))];
      if (uniqueValues.length > 1) {
        parameterDifferences.push({
          parameter: paramName,
          differences: valuesByRun
        });
      }
    });

    if (parameterDifferences.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot merge runs with different parameters',
          details: {
            parameterDifferences,
            runs: runsResult.rows.map((row: any) => ({
              id: row.id,
              name: row.run_name
            }))
          }
        },
        { status: 400 }
      );
    }

    // Calculate merged date range
    const mergedDateRange = dateRanges.length > 0 ? {
      startDate: dateRanges.reduce((min: any, dr: any) => dr.startDate < min ? dr.startDate : min, dateRanges[0].startDate),
      endDate: dateRanges.reduce((max: any, dr: any) => dr.endDate > max ? dr.endDate : max, dateRanges[0].endDate)
    } : null;

    // If we get here, the runs can be merged
    return NextResponse.json({
      success: true,
      canMerge: true,
      runs: runsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.run_name,
        description: row.run_description,
        strategy: row.strategy_name,
        dateRange: dateRanges.find((dr: any) => dr.runId === row.id)
      })),
      mergedDateRange
    });

  } catch (error) {
    console.error('Error validating merge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
