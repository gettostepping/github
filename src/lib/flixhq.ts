import axios from 'axios';
import * as cheerio from 'cheerio';

export const FLIXHQ_BASE_URL = 'https://flixhq.to';

export enum MovieType {
  MOVIE = 'MOVIE',
  TVSERIES = 'TVSERIES'
}

export interface IResult {
  id: string;
  title: string;
  url: string;
  image?: string;
  type?: MovieType;
}

export interface ISearchResult {
  currentPage: number;
  hasNextPage: boolean;
  results: IResult[];
}

export interface IMovieInfo extends IResult {
  description?: string;
  releaseDate?: string;
  genres?: string[];
  casts?: string[];
  tags?: string[];
  production?: string;
  duration?: string;
  rating?: number;
  episodes?: IEpisode[];
}

export interface IEpisode {
  id: string;
  title: string;
  number: number;
  season?: number;
  url: string;
}

export interface IEpisodeServer {
  name: string;
  id: string; // The data-linkid or data-id
  url: string; // The ajax endpoint or direct url
}

export interface ISource {
    url: string;
    quality?: string;
    isM3U8?: boolean;
    subtitles?: ISubtitle[];
    headers?: Record<string, string>;
}

export interface ISubtitle {
    url: string;
    lang: string;
}

export class FlixHQ {
  private baseUrl: string;
  private client: any;

  constructor(baseUrl: string = FLIXHQ_BASE_URL) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
            'Referer': this.baseUrl,
            'X-Requested-With': 'XMLHttpRequest',
        }
    });
  }

  async fetchTrendingMovies(): Promise<IResult[]> {
      try {
          const { data } = await this.client.get('/home');
          const $ = cheerio.load(data);
          const results: IResult[] = [];
          
          $('#trending-movies .flw-item').each((i, element) => {
              const item = $(element);
              const title = item.find('.film-detail > h3 > a').attr('title');
              const href = item.find('.film-poster > a').attr('href');
              const image = item.find('.film-poster > img').attr('data-src') || item.find('.film-poster > img').attr('src');
              
              if (title && href) {
                  results.push({
                      id: href.substring(1),
                      title,
                      url: `${this.baseUrl}${href}`,
                      image,
                      type: MovieType.MOVIE
                  });
              }
          });
          return results;
      } catch (err) {
          console.error('FlixHQ Trending Error:', err);
          return [];
      }
  }

  async fetchTrendingTV(): Promise<IResult[]> {
      try {
          const { data } = await this.client.get('/home');
          const $ = cheerio.load(data);
          const results: IResult[] = [];
          
          $('#trending-tv .flw-item').each((i, element) => {
              const item = $(element);
              const title = item.find('.film-detail > h3 > a').attr('title');
              const href = item.find('.film-poster > a').attr('href');
              const image = item.find('.film-poster > img').attr('data-src') || item.find('.film-poster > img').attr('src');
              
              if (title && href) {
                  results.push({
                      id: href.substring(1),
                      title,
                      url: `${this.baseUrl}${href}`,
                      image,
                      type: MovieType.TVSERIES
                  });
              }
          });
          return results;
      } catch (err) {
          console.error('FlixHQ Trending TV Error:', err);
          return [];
      }
  }

  async search(query: string, page: number = 1): Promise<ISearchResult> {
    const searchUrl = `/search/${query.replace(/[\W_]+/g, '-')}?page=${page}`;
    try {
        const { data } = await this.client.get(searchUrl);
        const $ = cheerio.load(data);

        const results: IResult[] = [];
        $('.film_list-wrap > div.flw-item').each((i, element) => {
        const item = $(element);
        const title = item.find('.film-detail > h2 > a').attr('title');
        const href = item.find('.film-poster > a').attr('href');
        const image = item.find('.film-poster > img').attr('data-src') || item.find('.film-poster > img').attr('src');
        const typeStr = item.find('.film-detail > div.fd-infor > span.float-right').text().trim(); 

        if (title && href) {
            results.push({
            id: href.substring(1), // Remove leading slash
            title,
            url: `${this.baseUrl}${href}`,
            image,
            type: typeStr === 'Movie' ? MovieType.MOVIE : MovieType.TVSERIES 
            });
        }
        });

        const hasNextPage = $('.pagination .next').length > 0;

        return {
        currentPage: page,
        hasNextPage,
        results
        };
    } catch (err) {
        console.error('FlixHQ Search Error:', err);
        return { currentPage: page, hasNextPage: false, results: [] };
    }
  }

  async fetchMovieInfo(mediaId: string): Promise<IMovieInfo> {
      if (!mediaId.startsWith(this.baseUrl)) {
        if (!mediaId.startsWith('/')) mediaId = `/${mediaId}`;
      } else {
          mediaId = mediaId.replace(this.baseUrl, '');
      }

      const { data } = await this.client.get(mediaId);
      const $ = cheerio.load(data);

      const title = $('.heading-name > a:nth-child(1)').text();
      const description = $('.description').text().trim();
      const image = $('.m_i-d-poster > div:nth-child(1) > img:nth-child(1)').attr('src');
      const movieDataId = $('#watch-movie').attr('data-id') || $('.watch_block').attr('data-id');
      const typeStr = mediaId.includes('/tv/') ? 'TV' : 'Movie';
      const isTV = typeStr === 'TV';
      
      const info: IMovieInfo = {
          id: mediaId.startsWith('/') ? mediaId.substring(1) : mediaId,
          title,
          url: `${this.baseUrl}${mediaId}`,
          image,
          description,
          type: isTV ? MovieType.TVSERIES : MovieType.MOVIE,
          episodes: []
      };

      if (!isTV) {
          // For Movies, add a single episode
          info.episodes?.push({
              id: movieDataId || info.id, 
              title: title,
              number: 1,
              url: `${this.baseUrl}/ajax/movie/episodes/${movieDataId}`
          });
      } else if (movieDataId) {
          // For TV, fetch seasons
          try {
              const seasonsUrl = `/ajax/v2/tv/seasons/${movieDataId}`;
              const { data: seasonsData } = await this.client.get(seasonsUrl);
              const $$ = cheerio.load(seasonsData);
              const seasonIds = $$('.dropdown-menu > a').map((i, el) => $$(el).attr('data-id')).get();
              
              let seasonNum = 1;
              for (const seasonId of seasonIds) {
                  try {
                      const episodesUrl = `/ajax/v2/season/episodes/${seasonId}`;
                      const { data: episodesData } = await this.client.get(episodesUrl);
                      const $$$ = cheerio.load(episodesData);
                      
                      $$$('.nav > li').each((i, el) => {
                          const epId = $$$(el).find('a').attr('id')?.split('-')[1];
                          const epTitle = $$$(el).find('a').attr('title');
                          const epNum = parseInt($$$(el).find('a').attr('title')?.split(':')[0].slice(3).trim() || '0');
                          
                          if (epId) {
                              info.episodes?.push({
                                  id: epId,
                                  title: epTitle || `Episode ${epNum}`,
                                  number: epNum,
                                  season: seasonNum,
                                  url: `${this.baseUrl}/ajax/v2/episode/servers/${epId}`
                              });
                          }
                      });
                  } catch (e) {
                      console.warn(`Failed to fetch episodes for season ${seasonNum}`, e);
                  }
                  seasonNum++;
              }
          } catch (e) {
              console.warn('Failed to fetch seasons', e);
          }
      }
      
      return info;
  }

  async fetchEpisodeServers(episodeId: string, mediaId?: string): Promise<IEpisodeServer[]> {
      const id = episodeId.match(/\d+$/)?.[0] || episodeId;
      
      // Determine endpoint based on whether it's movie or TV
      // But typically we can just try both or rely on what we stored in url property
      // If mediaId is provided and has 'movie', it's a movie
      
      const isMovie = mediaId?.includes('movie');
      let url = isMovie 
        ? `/ajax/movie/episodes/${id}`
        : `/ajax/v2/episode/servers/${id}`;

      try {
          const { data } = await this.client.get(url);
          const $ = cheerio.load(data);
          const servers: IEpisodeServer[] = [];
          
          $('.nav > li').each((i, el) => {
             const anchor = $(el).find('a');
             const name = anchor.attr('title') || anchor.text().trim();
             const linkId = anchor.attr('data-linkid') || anchor.attr('data-id');
             
             if (linkId) {
                 servers.push({
                     name: isMovie ? name.toLowerCase() : name.slice(6).trim().toLowerCase(),
                     id: linkId,
                     url: `${this.baseUrl}/ajax/get_link/${linkId}` 
                 });
             }
          });
          return servers;
      } catch (e) {
          console.error('Error fetching servers:', e);
          return [];
      }
  }

  async fetchEpisodeSources(serverId: string, serverName: string = 'upcloud'): Promise<ISource | null> {
      // 1. Get the embed link from FlixHQ
      // Try /ajax/episode/sources/{id} first (used by consumet)
      const url = `/ajax/episode/sources/${serverId}`; 
      
      try {
          const { data } = await this.client.get(url);
          
          let embedUrl: string | null = null;
          if (data.link) {
              embedUrl = data.link;
          }
          
          if (!embedUrl) return null;

          console.log(`Extracted embed URL: ${embedUrl}`);
          
          // 2. Extract from embed URL based on server type
          // If server is VidCloud or UpCloud (RabbitStream), use specific extraction logic
          if (serverName.includes('vidcloud') || serverName.includes('upcloud')) {
              return await this.extractRabbitStream(embedUrl);
          } else if (serverName.includes('mixdrop')) {
              // Mixdrop extraction (simplified/mocked for now as we focus on RabbitStream)
              return { url: embedUrl, isM3U8: false };
          }

          // Fallback
          return { url: embedUrl, isM3U8: embedUrl.includes('.m3u8') };
      } catch (e) {
          console.error('Error fetching sources:', e);
          return null;
      }
  }

  private async extractRabbitStream(embedUrl: string): Promise<ISource | null> {
      try {
          const decryptionService = 'https://dec.eatmynerds.live';
          const decUrl = new URL(decryptionService);
          decUrl.searchParams.set('url', embedUrl);
          
          const { data: initialData } = await axios.get(decUrl.toString());
          
          if (!initialData.sources || initialData.sources.length === 0) {
              throw new Error('No sources found from decryption service');
          }

          const masterPlaylistUrl = initialData.sources[0].file;
          const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36';

          const sources: ISource = {
              url: masterPlaylistUrl,
              isM3U8: true,
              headers: {
                  'Referer': embedUrl
              },
              subtitles: initialData.tracks?.map((t: any) => ({
                  url: t.file,
                  lang: t.label || 'Default'
              })) || []
          };

          return sources;

      } catch (e) {
          console.error('RabbitStream Extraction Error:', e);
          return null;
      }
  }
}
