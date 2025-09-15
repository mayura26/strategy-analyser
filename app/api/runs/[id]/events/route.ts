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

    // Get all events for this run
    const result = await db.execute({
      sql: `
        SELECT 
          event_type,
          date,
          time,
          trade_id,
          direction,
          target,
          closest_distance,
          reason,
          trigger,
          adjustment
        FROM strategy_events
        WHERE run_id = ?
        ORDER BY date, time ASC
      `,
      args: [runId]
    });

    // Organize events by type
    const events = {
      tpNearMisses: [],
      fillNearMisses: [],
      slAdjustments: []
    };

    result.rows.forEach(row => {
      switch (row.event_type) {
        case 'tp_near_miss':
          events.tpNearMisses.push({
            date: row.date,
            time: row.time,
            tradeId: row.trade_id,
            direction: row.direction,
            target: row.target,
            closestDistance: row.closest_distance,
            reason: row.reason
          });
          break;
        case 'fill_near_miss':
          events.fillNearMisses.push({
            date: row.date,
            time: row.time,
            direction: row.direction,
            closestDistance: row.closest_distance
          });
          break;
        case 'sl_adjustment':
          events.slAdjustments.push({
            date: row.date,
            time: row.time,
            tradeId: row.trade_id,
            direction: row.direction,
            trigger: row.trigger,
            adjustment: row.adjustment
          });
          break;
      }
    });

    return NextResponse.json({
      success: true,
      events
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
