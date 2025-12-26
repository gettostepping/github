import { NextRequest, NextResponse } from 'next/server';
import { FlixHQ } from '@/lib/flixhq';
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper';

const flixhq = new FlixHQ();

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'missing_id', message: 'Missing id parameter' },
      { status: 400 }
    );
  }

  try {
    const info = await flixhq.fetchMovieInfo(id);
    return NextResponse.json(info);
  } catch (error: any) {
    console.error('FlixHQ info error:', error);
    return NextResponse.json(
      { error: 'flixhq_info_error', message: error?.message || 'Failed to fetch info' },
      { status: 500 }
    );
  }
}

export const GET = withRequestLogging(getHandler);
