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
        SELECT metric_name, metric_value, metric_description
        FROM strategy_metrics
        WHERE run_id = ?
        ORDER BY metric_name ASC
      `,
      args: [runId]
    });

    return NextResponse.json({
      success: true,
      metrics: result.rows
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
