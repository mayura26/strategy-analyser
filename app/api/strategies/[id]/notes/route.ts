import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import '@/lib/init-db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { notes } = await request.json();

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'Invalid strategy ID' },
        { status: 400 }
      );
    }

    // Update the strategy notes
    await db.execute({
      sql: 'UPDATE strategies SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [notes || '', Number(id)]
    });

    return NextResponse.json({
      success: true,
      message: 'Notes updated successfully'
    });

  } catch (error) {
    console.error('Error updating strategy notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'Invalid strategy ID' },
        { status: 400 }
      );
    }

    // Get the strategy notes
    const result = await db.execute({
      sql: 'SELECT notes FROM strategies WHERE id = ?',
      args: [Number(id)]
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notes: result.rows[0].notes || ''
    });

  } catch (error) {
    console.error('Error fetching strategy notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
