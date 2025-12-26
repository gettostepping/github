import { NextRequest, NextResponse } from 'next/server';
import { FlixHQ } from '@/lib/flixhq';
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper';

const flixhq = new FlixHQ();

async function getHandler(req: NextRequest) {
  try {
    const [movies, tv] = await Promise.all([
      flixhq.fetchTrendingMovies(),
      flixhq.fetchTrendingTV()
    ]);

    return NextResponse.json({
      movies,
      tv
    });
  } catch (error: any) {
    console.error('FlixHQ trending error:', error);
    return NextResponse.json(
      { error: 'flixhq_trending_error', message: error?.message || 'Failed to fetch trending' },
      { status: 500 }
    );
  }
}

export const GET = withRequestLogging(getHandler);
