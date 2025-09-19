import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import '@/lib/init-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const runId = parseInt(params.id);

    if (isNaN(runId)) {
      return NextResponse.json(
        { error: 'Invalid run ID' },
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

    return NextResponse.json({
      success: true,
      rawData: run.raw_data,
      runName: run.run_name,
      runDescription: run.run_description,
      createdAt: run.created_at
    });

  } catch (error) {
    console.error('Error fetching raw data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch raw data' },
      { status: 500 }
    );
  }
}
