import { NextRequest, NextResponse } from 'next/server';
import { FlixHQ } from '@/lib/flixhq';
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper';

const flixhq = new FlixHQ();

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const episodeId = searchParams.get('episodeId');
  const mediaId = searchParams.get('mediaId');

  if (!episodeId) {
    return NextResponse.json(
      { error: 'missing_episode_id', message: 'Missing episodeId parameter' },
      { status: 400 }
    );
  }

  try {
    const servers = await flixhq.fetchEpisodeServers(episodeId, mediaId || undefined);
    return NextResponse.json(servers);
  } catch (error: any) {
    console.error('FlixHQ servers error:', error);
    return NextResponse.json(
      { error: 'flixhq_servers_error', message: error?.message || 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

export const GET = withRequestLogging(getHandler);
