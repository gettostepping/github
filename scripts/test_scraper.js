const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://flixhq.to';

class FlixHQ {
  constructor() {
    this.baseUrl = BASE_URL;
    this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
            'Referer': this.baseUrl,
            'X-Requested-With': 'XMLHttpRequest',
        }
    });
  }

  async search(query, page = 1) {
    const searchUrl = `/search/${query.replace(/[\W_]+/g, '-')}?page=${page}`;
    try {
        console.log(`Searching: ${searchUrl}`);
        const { data } = await this.client.get(searchUrl);
        const $ = cheerio.load(data);

        const results = [];
        $('.film_list-wrap > div.flw-item').each((i, element) => {
        const item = $(element);
        const title = item.find('.film-detail > h2 > a').attr('title');
        const href = item.find('.film-poster > a').attr('href');
        const image = item.find('.film-poster > img').attr('data-src') || item.find('.film-poster > img').attr('src');
        const typeStr = item.find('.film-detail > div.fd-infor > span.float-right').text().trim(); 

        if (title && href) {
            results.push({
            id: href.substring(1), 
            title,
            url: `${this.baseUrl}${href}`,
            image,
            type: typeStr === 'Movie' ? 'MOVIE' : 'TVSERIES'
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
        console.error('FlixHQ Search Error:', err.message);
        return { currentPage: page, hasNextPage: false, results: [] };
    }
  }

  async fetchMovieInfo(mediaId) {
      if (!mediaId.startsWith(this.baseUrl)) {
        if (!mediaId.startsWith('/')) mediaId = `/${mediaId}`;
      } else {
          mediaId = mediaId.replace(this.baseUrl, '');
      }

      console.log(`Fetching Info: ${mediaId}`);
      const { data } = await this.client.get(mediaId);
      const $ = cheerio.load(data);

      const title = $('.heading-name > a:nth-child(1)').text();
      const description = $('.description').text().trim();
      const image = $('.m_i-d-poster > div:nth-child(1) > img:nth-child(1)').attr('src');
      const movieDataId = $('#watch-movie').attr('data-id') || $('.watch_block').attr('data-id');
      const typeStr = mediaId.includes('/tv/') ? 'TV' : 'Movie';
      const isTV = typeStr === 'TV';
      
      const info = {
          id: mediaId.startsWith('/') ? mediaId.substring(1) : mediaId,
          title,
          url: `${this.baseUrl}${mediaId}`,
          image,
          description,
          type: isTV ? 'TVSERIES' : 'MOVIE',
          episodes: []
      };

      if (!isTV) {
          info.episodes.push({
              id: movieDataId || info.id, 
              title: title,
              number: 1,
              url: `${this.baseUrl}/ajax/movie/episodes/${movieDataId}`
          });
      } else if (movieDataId) {
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
                              info.episodes.push({
                                  id: epId,
                                  title: epTitle || `Episode ${epNum}`,
                                  number: epNum,
                                  season: seasonNum,
                                  url: `${this.baseUrl}/ajax/v2/episode/servers/${epId}`
                              });
                          }
                      });
                  } catch (e) {
                      console.warn(`Failed to fetch episodes for season ${seasonNum}`, e.message);
                  }
                  seasonNum++;
              }
          } catch (e) {
              console.warn('Failed to fetch seasons', e.message);
          }
      }
      
      return info;
  }

  async fetchEpisodeServers(episodeId, mediaId) {
      const id = episodeId.match(/\d+$/)?.[0] || episodeId;
      console.log(`Fetching Servers for ID: ${id}`);

      const isMovie = mediaId?.includes('movie');
      let url = isMovie 
        ? `/ajax/movie/episodes/${id}`
        : `/ajax/v2/episode/servers/${id}`;

      try {
          const { data } = await this.client.get(url);
          const $ = cheerio.load(data);
          const servers = [];
          
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
          console.error('Error fetching servers:', e.message);
          return [];
      }
  }

  async fetchEpisodeSources(serverId, serverName = 'upcloud') {
      const url = `/ajax/episode/sources/${serverId}`;
      console.log(`Fetching Sources: ${url}`);
      
      try {
          const { data } = await this.client.get(url);
          
          let embedUrl = null;
          if (data.link) {
              embedUrl = data.link;
          }
          
          if (!embedUrl) return null;
          console.log(`Extracted embed URL: ${embedUrl}`);
          
          if (serverName.includes('vidcloud') || serverName.includes('upcloud')) {
              return await this.extractRabbitStream(embedUrl);
          } else if (serverName.includes('mixdrop')) {
              return { url: embedUrl, isM3U8: false };
          }

          return { url: embedUrl, isM3U8: embedUrl.includes('.m3u8') };
      } catch (e) {
          console.error('Error fetching sources:', e.message);
          return null;
      }
  }

  async extractRabbitStream(embedUrl) {
      try {
          const decryptionService = 'https://dec.eatmynerds.live';
          const decUrl = new URL(decryptionService);
          decUrl.searchParams.set('url', embedUrl);
          
          console.log(`Decrypting via ${decUrl.toString()}...`);
          const { data: initialData } = await axios.get(decUrl.toString());
          
          if (!initialData.sources || initialData.sources.length === 0) {
              throw new Error('No sources found from decryption service');
          }

          const masterPlaylistUrl = initialData.sources[0].file;
          return {
              url: masterPlaylistUrl,
              isM3U8: true,
              subtitles: initialData.tracks?.map(t => ({
                  url: t.file,
                  lang: t.label || 'Default'
              })) || []
          };

      } catch (e) {
          console.error('RabbitStream Extraction Error:', e.message);
          return null;
      }
  }
}

// Test Run
(async () => {
    const scraper = new FlixHQ();
    
    // 1. Search
    const searchRes = await scraper.search('avengers');
    console.log(`Found ${searchRes.results.length} results`);
    const firstMovie = searchRes.results[0];
    
    if (firstMovie) {
        console.log(`Testing with: ${firstMovie.title} (${firstMovie.id})`);
        
        // 2. Info
        const info = await scraper.fetchMovieInfo(firstMovie.id);
        console.log(`Info: ${info.title}, Type: ${info.type}`);
        
        if (info.episodes.length > 0) {
            const ep = info.episodes[0];
            console.log(`Episode ID: ${ep.id}`);
            
            // 3. Servers
            const servers = await scraper.fetchEpisodeServers(ep.id, firstMovie.id);
            console.log(`Found ${servers.length} servers`);
            
            if (servers.length > 0) {
                const srv = servers[0];
                console.log(`Testing Server: ${srv.name} (ID: ${srv.id})`);
                
                // 4. Sources
                const source = await scraper.fetchEpisodeSources(srv.id, srv.name);
                console.log('Source:', source);
            }
        }
    }
})();
