import { getAccessToken } from './googleAuth';
import { Anime, Movie, Episode, Season } from '../types';

export interface SheetImportResult {
  anime: Anime[];
  movies: Movie[];
  stats: {
    animeCount: number;
    seasonCount: number;
    episodeCount: number;
    movieCount: number;
  };
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  // Check if full URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise assume raw ID
  return trimmed;
}

/**
 * Creates a brand-new Google Spreadsheet with all current Anime, Episodes, and Movies.
 * Requires user confirmation before calling.
 */
export async function exportCatalogToGoogleSheets(
  animeList: Anime[],
  movieList: Movie[],
  sheetTitle: string = `Anime Mini App Catalog - ${new Date().toLocaleDateString()}`
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google first to access Google Sheets.');
  }

  // 1. Create spreadsheet structure
  const createPayload = {
    properties: {
      title: sheetTitle
    },
    sheets: [
      {
        properties: {
          title: 'Anime & Episodes',
          gridProperties: {
            frozenRowCount: 1
          }
        }
      },
      {
        properties: {
          title: 'Movies',
          gridProperties: {
            frozenRowCount: 1
          }
        }
      }
    ]
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });

  if (!createRes.ok) {
    const errData: any = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to create Google Spreadsheet (${createRes.status})`);
  }

  const sheetData: any = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare Anime & Episodes data rows
  const animeHeaderRow = [
    'Anime ID',
    'Title',
    'Alt / Japanese Title',
    'Description',
    'Poster URL',
    'Backdrop URL',
    'Genres (comma separated)',
    'Status',
    'Season Number',
    'Season Title',
    'Episode Number',
    'Episode Title',
    'Duration (min)',
    'Stream URL (Main/Default)',
    'Stream URL 480p (SD)',
    'Stream URL 720p (HD)',
    'Stream URL 1080p (Full HD)',
    'Published (TRUE/FALSE)'
  ];

  const animeRows: any[][] = [animeHeaderRow];

  for (const anime of animeList) {
    const seasons = anime.seasons && anime.seasons.length > 0 ? anime.seasons : [];
    if (seasons.length === 0) {
      animeRows.push([
        anime.id,
        anime.title || '',
        anime.alt_title || '',
        anime.description || '',
        anime.poster_url || '',
        anime.backdrop_url || '',
        (anime.genres || []).join(', '),
        anime.status || 'Ongoing',
        1,
        'Season 1',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        anime.is_published !== false ? 'TRUE' : 'FALSE'
      ]);
    } else {
      for (const season of seasons) {
        const episodes = season.episodes && season.episodes.length > 0 ? season.episodes : [];
        if (episodes.length === 0) {
          animeRows.push([
            anime.id,
            anime.title || '',
            anime.alt_title || '',
            anime.description || '',
            anime.poster_url || '',
            anime.backdrop_url || '',
            (anime.genres || []).join(', '),
            anime.status || 'Ongoing',
            season.season_number || 1,
            season.title || `Season ${season.season_number || 1}`,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            anime.is_published !== false ? 'TRUE' : 'FALSE'
          ]);
        } else {
          for (const ep of episodes) {
            animeRows.push([
              anime.id,
              anime.title || '',
              anime.alt_title || '',
              anime.description || '',
              anime.poster_url || '',
              anime.backdrop_url || '',
              (anime.genres || []).join(', '),
              anime.status || 'Ongoing',
              season.season_number || 1,
              season.title || `Season ${season.season_number || 1}`,
              ep.episode_number,
              ep.title || `Episode ${ep.episode_number}`,
              Math.round((ep.duration_seconds || 1440) / 60),
              ep.stream_url || '',
              ep.stream_urls?.['480p'] || '',
              ep.stream_urls?.['720p'] || '',
              ep.stream_urls?.['1080p'] || '',
              ep.is_published !== false ? 'TRUE' : 'FALSE'
            ]);
          }
        }
      }
    }
  }

  // 3. Prepare Movies data rows
  const movieHeaderRow = [
    'Movie ID',
    'Title',
    'Alt / Japanese Title',
    'Description',
    'Poster URL',
    'Backdrop URL',
    'Genres (comma separated)',
    'Runtime (min)',
    'Rating (0-10)',
    'Stream URL (Main/Default)',
    'Stream URL 480p (SD)',
    'Stream URL 720p (HD)',
    'Stream URL 1080p (Full HD)',
    'Published (TRUE/FALSE)'
  ];

  const movieRows: any[][] = [movieHeaderRow];

  for (const movie of movieList) {
    movieRows.push([
      movie.id,
      movie.title || '',
      movie.alt_title || '',
      movie.description || '',
      movie.poster_url || '',
      movie.backdrop_url || '',
      (movie.genres || []).join(', '),
      movie.runtime_minutes || 110,
      movie.rating || 8.5,
      movie.stream_url || '',
      movie.stream_urls?.['480p'] || '',
      movie.stream_urls?.['720p'] || '',
      movie.stream_urls?.['1080p'] || '',
      movie.is_published !== false ? 'TRUE' : 'FALSE'
    ]);
  }

  // 4. Batch update values to Google Sheets
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: "'Anime & Episodes'!A1:R",
            values: animeRows
          },
          {
            range: "'Movies'!A1:N",
            values: movieRows
          }
        ]
      })
    }
  );

  if (!updateRes.ok) {
    const errData: any = await updateRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to write data to Google Spreadsheet (${updateRes.status})`);
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Reads and imports Anime, Seasons, Episodes, and Movies from an existing Google Sheet.
 */
export async function importCatalogFromGoogleSheet(spreadsheetIdOrUrl: string): Promise<SheetImportResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google first to access Google Sheets.');
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Spreadsheet URL or ID.');
  }

  // Read both tabs
  const ranges = ["'Anime & Episodes'!A2:R", "'Movies'!A2:N"];
  const queryParam = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryParam}&valueRenderOption=UNFORMATTED_VALUE`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to read Google Sheet (${res.status}). Verify sharing permissions.`);
  }

  const data: any = await res.json();
  const valueRanges = data.valueRanges || [];

  const animeRows: any[][] = valueRanges[0]?.values || [];
  const movieRows: any[][] = valueRanges[1]?.values || [];

  // Parse Anime rows into grouped Anime -> Seasons -> Episodes
  const animeMap = new Map<string, Anime>();
  let totalSeasons = 0;
  let totalEpisodes = 0;

  for (const row of animeRows) {
    if (!row || row.length === 0) continue;
    const animeId = String(row[0] || '').trim();
    const title = String(row[1] || '').trim();
    if (!animeId && !title) continue;

    const finalAnimeId = animeId || `anime-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    let anime = animeMap.get(finalAnimeId);
    if (!anime) {
      anime = {
        id: finalAnimeId,
        title: title || 'Untitled Anime',
        alt_title: String(row[2] || '').trim(),
        slug: finalAnimeId,
        description: String(row[3] || '').trim(),
        poster_url: String(row[4] || '').trim() || '/images/poster_chrono_blade.jpg',
        backdrop_url: String(row[5] || '').trim() || '/images/hero_cyber_samurai.jpg',
        release_year: new Date().getFullYear(),
        rating: 8.5,
        classification: 'PG-13',
        status: (String(row[7] || 'Ongoing').trim() as any) || 'Ongoing',
        language: 'Japanese',
        available_audio: ['Japanese', 'English'],
        available_subtitles: ['English', 'Hindi'],
        distribution_rights_confirmed: true,
        view_count: 0,
        is_published: String(row[17] || 'TRUE').toUpperCase() !== 'FALSE',
        genres: String(row[6] || '')
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean),
        categories: ['all', 'anime'],
        placements: ['new_episodes', 'trending'],
        seasons: []
      };
      animeMap.set(finalAnimeId, anime);
    }

    // Season info
    const seasonNum = parseInt(String(row[8] || '1'), 10) || 1;
    const seasonTitle = String(row[9] || `Season ${seasonNum}`).trim();

    if (!anime.seasons) anime.seasons = [];
    let season = anime.seasons.find((s) => s.season_number === seasonNum);
    if (!season) {
      season = {
        id: `s-${seasonNum}-${finalAnimeId}`,
        anime_id: finalAnimeId,
        season_number: seasonNum,
        title: seasonTitle,
        episodes: [],
        is_published: true
      };
      anime.seasons.push(season);
      totalSeasons++;
    }

    // Episode info
    const epNumRaw = row[10];
    if (epNumRaw !== undefined && epNumRaw !== '') {
      const epNum = parseInt(String(epNumRaw), 10) || 1;
      const epTitle = String(row[11] || `Episode ${epNum}`).trim();
      const durationMins = parseInt(String(row[12] || '24'), 10) || 24;
      const streamUrl = String(row[13] || '').trim();
      const url480p = String(row[14] || '').trim();
      const url720p = String(row[15] || '').trim();
      const url1080p = String(row[16] || '').trim();
      const epPublished = String(row[17] || 'TRUE').toUpperCase() !== 'FALSE';

      const stream_urls: Record<string, string> = {};
      if (url480p) stream_urls['480p'] = url480p;
      if (url720p) stream_urls['720p'] = url720p;
      if (url1080p) stream_urls['1080p'] = url1080p;

      const mainUrl = streamUrl || url1080p || url720p || url480p || '';

      const episode: Episode = {
        id: `ep-${epNum}-${season.id}`,
        anime_id: finalAnimeId,
        season_id: season.id,
        episode_number: epNum,
        title: epTitle,
        description: '',
        duration_seconds: durationMins * 60,
        thumbnail_url: anime.poster_url || '/images/hero_cyber_samurai.jpg',
        stream_url: mainUrl,
        stream_urls: Object.keys(stream_urls).length > 0 ? stream_urls : undefined,
        distribution_rights_confirmed: true,
        is_published: epPublished,
        view_count: 0
      };

      if (!season.episodes) season.episodes = [];
      const existingEpIdx = season.episodes.findIndex((e) => e.episode_number === epNum);
      if (existingEpIdx >= 0) {
        season.episodes[existingEpIdx] = episode;
      } else {
        season.episodes.push(episode);
        totalEpisodes++;
      }
    }
  }

  // Parse Movies
  const movies: Movie[] = [];
  for (const row of movieRows) {
    if (!row || row.length === 0) continue;
    const movieId = String(row[0] || '').trim();
    const title = String(row[1] || '').trim();
    if (!movieId && !title) continue;

    const finalMovieId = movieId || `movie-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const url480p = String(row[10] || '').trim();
    const url720p = String(row[11] || '').trim();
    const url1080p = String(row[12] || '').trim();
    const streamUrl = String(row[9] || '').trim();

    const stream_urls: Record<string, string> = {};
    if (url480p) stream_urls['480p'] = url480p;
    if (url720p) stream_urls['720p'] = url720p;
    if (url1080p) stream_urls['1080p'] = url1080p;

    const mainUrl = streamUrl || url1080p || url720p || url480p || '';

    const movie: Movie = {
      id: finalMovieId,
      title: title || 'Untitled Movie',
      alt_title: String(row[2] || '').trim(),
      slug: finalMovieId,
      description: String(row[3] || '').trim(),
      poster_url: String(row[4] || '').trim() || '/images/poster_spirit_blade.jpg',
      backdrop_url: String(row[5] || '').trim() || '/images/hero_cyber_samurai.jpg',
      release_year: new Date().getFullYear(),
      runtime_minutes: parseInt(String(row[7] || '110'), 10) || 110,
      rating: parseFloat(String(row[8] || '8.5')) || 8.5,
      stream_url: mainUrl,
      stream_urls: Object.keys(stream_urls).length > 0 ? stream_urls : undefined,
      classification: 'PG-13',
      status: 'Completed',
      language: 'Japanese',
      available_audio: ['Japanese', 'English'],
      available_subtitles: ['English', 'Hindi'],
      distribution_rights_confirmed: true,
      view_count: 0,
      is_published: String(row[13] || 'TRUE').toUpperCase() !== 'FALSE',
      genres: String(row[6] || '')
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
      categories: ['all', 'movies'],
      placements: ['popular_movies', 'trending']
    };

    movies.push(movie);
  }

  const parsedAnime = Array.from(animeMap.values());

  return {
    anime: parsedAnime,
    movies,
    stats: {
      animeCount: parsedAnime.length,
      seasonCount: totalSeasons,
      episodeCount: totalEpisodes,
      movieCount: movies.length
    }
  };
}
