import { NextRequest, NextResponse } from 'next/server';
import { FlixHQ } from '@/lib/flixhq';
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper';

const flixhq = new FlixHQ();

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serverId = searchParams.get('serverId');
  const serverName = searchParams.get('serverName');

  if (!serverId) {
    return NextResponse.json(
      { error: 'missing_server_id', message: 'Missing serverId parameter' },
      { status: 400 }
    );
  }

  try {
    const sources = await flixhq.fetchEpisodeSources(serverId, serverName || undefined);
    return NextResponse.json(sources);
  } catch (error: any) {
    console.error('FlixHQ sources error:', error);
    return NextResponse.json(
      { error: 'flixhq_sources_error', message: error?.message || 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

export const GET = withRequestLogging(getHandler);
