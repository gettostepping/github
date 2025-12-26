import { NextRequest, NextResponse } from 'next/server';
import { FlixHQ } from '@/lib/flixhq';
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper';

const flixhq = new FlixHQ();

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');
  const page = parseInt(searchParams.get('page') || '1');

  if (!query) {
    return NextResponse.json(
      { error: 'missing_query', message: 'Missing query parameter' },
      { status: 400 }
    );
  }

  try {
    const result = await flixhq.search(query, page);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('FlixHQ search error:', error);
    return NextResponse.json(
      { error: 'flixhq_search_error', message: error?.message || 'Failed to search' },
      { status: 500 }
    );
  }
}

export const GET = withRequestLogging(getHandler);
