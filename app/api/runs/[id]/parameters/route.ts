import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runId = parseInt(id);

    if (isNaN(runId)) {
      return NextResponse.json(
        { error: 'Invalid run ID' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: `
        SELECT parameter_name, parameter_value, parameter_type
        FROM strategy_parameters
        WHERE run_id = ?
        ORDER BY parameter_name ASC
      `,
      args: [runId]
    });

    return NextResponse.json({
      success: true,
      parameters: result.rows
    });

  } catch (error) {
    console.error('Error fetching parameters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
