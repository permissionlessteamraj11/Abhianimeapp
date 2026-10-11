/**
 * Stark Anime - Cloudflare Workers Telegram Bot & Storage Engine
 * Bot Token: 8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ
 * API ID: 37729457 | API Hash: bb68973b7efcbbd074cda984c95502d6
 */

const DEFAULT_BOT_TOKEN = "8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ";
const DEFAULT_API_ID = "37729457";
const DEFAULT_API_HASH = "bb68973b7efcbbd074cda984c95502d6";

let MEMORY_STORE = {
  anime: [],
  movies: [],
  hero_banners: [],
  version: 1
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const botToken = env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/set-webhook' || url.pathname === '/setup') {
      const webhookUrl = `${url.origin}/webhook`;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      const data = await res.json();
      return new Response(JSON.stringify({
        success: data.ok === true,
        message: data.ok ? "Webhook registered successfully with Telegram!" : "Failed to register webhook with Telegram.",
        bot_url: `https://t.me/starkanimebot`,
        webhook_url: webhookUrl,
        telegram_response: data,
        instructions: "Bot ready hai! Ab Telegram par bot open karke /start bhejien aur videos forward/upload karna shuru karein."
      }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/webhook' && request.method === 'POST') {
      try {
        const update = await request.json();
        ctx.waitUntil(handleTelegramUpdate(update, env, botToken, url.origin));
        return new Response('OK', { status: 200 });
      } catch (err) {
        return new Response(`Error: ${err.message}`, { status: 500 });
      }
    }

    if (url.pathname === '/api/catalog' || url.pathname === '/catalog') {
      const catalog = await getCatalog(env);
      return new Response(JSON.stringify(catalog), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname.startsWith('/api/stream/')) {
      const fileId = url.pathname.replace('/api/stream/', '');
      if (!fileId) return new Response('File ID required', { status: 400 });

      const filePathRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const filePathData = await filePathRes.json();

      if (!filePathData.ok || !filePathData.result?.file_path) {
        return new Response('File not found in Telegram storage', { status: 404 });
      }

      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePathData.result.file_path}`;
      return Response.redirect(fileUrl, 302);
    }

    const catalog = await getCatalog(env);
    let totalEps = 0;
    (catalog.anime || []).forEach(a => {
      a.seasons?.forEach(s => {
        totalEps += s.episodes?.length || 0;
      });
    });

    return new Response(JSON.stringify({
      status: "online",
      service: "Stark Anime Telegram Bot & Cloudflare Engine",
      bot_token: botToken.slice(0, 10) + "...",
      api_id: DEFAULT_API_ID,
      urls: {
        set_webhook: `${url.origin}/set-webhook`,
        webhook_endpoint: `${url.origin}/webhook`,
        catalog_api: `${url.origin}/api/catalog`,
        stream_base: `${url.origin}/api/stream/`
      },
      stats: {
        total_anime: catalog.anime?.length || 0,
        total_movies: catalog.movies?.length || 0,
        total_episodes: totalEps,
        version: catalog.version || 1
      },
      setup_instructions: [
        `1. Click or open: ${url.origin}/set-webhook`,
        `2. Open your bot in Telegram and send /start`,
        `3. Send or forward anime videos with caption: /ep <anime_id> <season_num> <ep_num> [quality] <Episode Title>`
      ]
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

async function handleTelegramUpdate(update, env, botToken, origin) {
  if (!update.message) return;
  const msg = update.message;
  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || '').trim();

  if (text.startsWith('/start')) {
    await sendTelegramMessage(botToken, chatId, `
⚡ *Stark Anime - Episode & Video Upload Bot*

Welcome! Is bot se aap Anime Series, Seasons aur Episodes direct upload & control kar sakte ho. Multi-quality (480p, 720p, 1080p) videos control ho jayengi.

*Main Commands:*
• \`/addanime <Title>\` - Naya Anime banayein
• \`/listanime\` - Sabhi Anime series list karein with IDs
• \`/editanime <anime_id> <field> <value>\` - Anime detail edit karein
• \`/editepisode <anime_id> <season_num> <ep_num> <field> <value>\` - Episode edit karein
• \`/forward <anime_id> <season_num> <ep_num>\` - Episode videos bot chat me mangwaye
• \`/status\` - Storage & database stats

*Video Uploading / Forwarding:*
Kisi bhi 480p, 720p, 1080p video ko bot me bhejien/forward karein aur caption me likhein:
\`/ep <anime_id> <season_num> <ep_num> <quality> <Episode Title>\`
_Example:_ \`/ep anime_12345 1 1 1080p Episode 1 The Beginning\`
    `);
    return;
  }

  if (text.startsWith('/status')) {
    const catalog = await getCatalog(env);
    let totalEps = 0;
    (catalog.anime || []).forEach(a => {
      a.seasons?.forEach(s => {
        totalEps += s.episodes?.length || 0;
      });
    });

    await sendTelegramMessage(botToken, chatId, `
📊 *Cloudflare Storage Status*
• Total Anime: *${catalog.anime?.length || 0}*
• Total Movies: *${catalog.movies?.length || 0}*
• Total Episodes: *${totalEps}*
• Catalog Version: *v${catalog.version || 1}*
• Origin URL: \`${origin}\`
    `);
    return;
  }

  if (text.startsWith('/addanime')) {
    const parts = text.split(' ');
    parts.shift();
    const title = parts.join(' ').trim();

    if (!title) {
      await sendTelegramMessage(botToken, chatId, "❌ Usage: `/addanime Naruto Shippuden`");
      return;
    }

    const catalog = await getCatalog(env);
    catalog.anime = catalog.anime || [];
    const animeId = `anime_${Date.now()}`;
    const newAnime = {
      id: animeId,
      title: title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: `${title} anime series.`,
      poster_url: '/images/stark_anime_logo_1790699252710.jpg',
      backdrop_url: '/images/stark_anime_logo_1790699252710.jpg',
      rating: 9.0,
      release_year: new Date().getFullYear(),
      status: 'Ongoing',
      classification: 'PG-13',
      language: 'Japanese',
      available_audio: ['Japanese', 'Hindi', 'English'],
      available_subtitles: ['English', 'Hindi'],
      distribution_rights_confirmed: true,
      is_published: true,
      genres: ['Action', 'Adventure'],
      categories: ['all', 'anime'],
      seasons: [
        {
          id: `s1_${animeId}`,
          anime_id: animeId,
          season_number: 1,
          title: 'Season 1',
          description: 'Season 1',
          is_published: true,
          episodes: []
        }
      ]
    };

    catalog.anime.push(newAnime);
    await saveCatalog(env, catalog);

    await sendTelegramMessage(botToken, chatId, `
✅ *Anime Created Successfully!*
• Title: *${title}*
• Anime ID: \`${animeId}\`
• Default Season: \`Season 1\`

Video bhejien aur caption:
\`/ep ${animeId} 1 1 1080p Episode 1 Title\`
    `);
    return;
  }

  if (text.startsWith('/listanime')) {
    const catalog = await getCatalog(env);
    const animeList = catalog.anime || [];
    if (animeList.length === 0) {
      await sendTelegramMessage(botToken, chatId, "ℹ️ Catalog me koi anime nahi hai. \`/addanime <Title>\` se pehle anime create karein.");
      return;
    }

    let msgText = "📺 *Anime Catalog List:*\n\n";
    animeList.forEach((a, idx) => {
      const epCount = a.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
      msgText += `${idx + 1}. *${a.title}*\n   • ID: \`${a.id}\`\n   • Seasons: ${a.seasons?.length || 0} | Episodes: ${epCount}\n\n`;
    });

    await sendTelegramMessage(botToken, chatId, msgText);
    return;
  }

  if (text.startsWith('/editanime')) {
    const parts = text.split(' ');
    parts.shift();
    if (parts.length < 3) {
      await sendTelegramMessage(botToken, chatId, "❌ Usage: `/editanime <anime_id> <title|description|poster_url|status> <value>`");
      return;
    }

    const animeId = parts[0];
    const field = parts[1].toLowerCase();
    const value = parts.slice(2).join(' ');

    const catalog = await getCatalog(env);
    const anime = (catalog.anime || []).find(a => a.id === animeId);

    if (!anime) {
      await sendTelegramMessage(botToken, chatId, `❌ Anime ID \`${animeId}\` not found! Use \`/listanime\`.`);
      return;
    }

    if (field === 'title') {
      anime.title = value;
      anime.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    } else if (field === 'description') {
      anime.description = value;
    } else if (field === 'poster_url' || field === 'poster') {
      anime.poster_url = value;
    } else if (field === 'status') {
      anime.status = value;
    } else {
      await sendTelegramMessage(botToken, chatId, "❌ Valid fields: `title`, `description`, `poster_url`, `status`");
      return;
    }

    await saveCatalog(env, catalog);
    await sendTelegramMessage(botToken, chatId, `✅ *Anime Updated!* Field *${field}* set to: ${value}`);
    return;
  }

  if (text.startsWith('/editepisode')) {
    const parts = text.split(' ');
    parts.shift();
    if (parts.length < 5) {
      await sendTelegramMessage(botToken, chatId, "❌ Usage: `/editepisode <anime_id> <season_num> <ep_num> <title|description> <value>`");
      return;
    }

    const animeId = parts[0];
    const seasonNum = parseInt(parts[1]) || 1;
    const epNum = parseInt(parts[2]) || 1;
    const field = parts[3].toLowerCase();
    const value = parts.slice(4).join(' ');

    const catalog = await getCatalog(env);
    const anime = (catalog.anime || []).find(a => a.id === animeId);
    const season = anime?.seasons?.find(s => s.season_number === seasonNum);
    const episode = season?.episodes?.find(e => e.episode_number === epNum);

    if (!episode) {
      await sendTelegramMessage(botToken, chatId, `❌ Episode not found for Anime \`${animeId}\` S${seasonNum} E${epNum}`);
      return;
    }

    if (field === 'title') {
      episode.title = value;
    } else if (field === 'description') {
      episode.description = value;
    } else {
      await sendTelegramMessage(botToken, chatId, "❌ Valid fields: `title`, `description`");
      return;
    }

    await saveCatalog(env, catalog);
    await sendTelegramMessage(botToken, chatId, `✅ *Episode S${seasonNum} E${epNum} Updated!* ${field} = ${value}`);
    return;
  }

  if (text.startsWith('/forward')) {
    const parts = text.split(' ');
    parts.shift();
    if (parts.length < 3) {
      await sendTelegramMessage(botToken, chatId, "❌ Usage: `/forward <anime_id> <season_num> <ep_num>`");
      return;
    }

    const animeId = parts[0];
    const seasonNum = parseInt(parts[1]) || 1;
    const epNum = parseInt(parts[2]) || 1;

    const catalog = await getCatalog(env);
    const anime = (catalog.anime || []).find(a => a.id === animeId);
    const season = anime?.seasons?.find(s => s.season_number === seasonNum);
    const episode = season?.episodes?.find(e => e.episode_number === epNum);

    if (!episode) {
      await sendTelegramMessage(botToken, chatId, `❌ Episode S${seasonNum} E${epNum} not found for Anime \`${animeId}\`.`);
      return;
    }

    let forwardMsg = `🎬 *${anime.title}* - Season ${seasonNum} Episode ${epNum}\n• Title: *${episode.title}*\n\n*Available Video Qualities & Streams:*\n`;

    if (episode.video_assets && episode.video_assets.length > 0) {
      episode.video_assets.forEach(va => {
        forwardMsg += `• *${va.quality}*: [Stream Link](${va.stream_url})\n`;
      });
    } else if (episode.stream_url) {
      forwardMsg += `• *Default (${episode.quality || '1080p'})*: [Stream Link](${episode.stream_url})\n`;
    }

    await sendTelegramMessage(botToken, chatId, forwardMsg);

    // If telegram file ids exist, forward video messages directly to chat
    if (episode.video_assets && episode.video_assets.length > 0) {
      for (const va of episode.video_assets) {
        if (va.telegram_file_id) {
          try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                video: va.telegram_file_id,
                caption: `📹 *${anime.title}* S${seasonNum} E${epNum} (${va.quality})`
              })
            });
          } catch {}
        }
      }
    } else if (episode.telegram_file_id) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            video: episode.telegram_file_id,
            caption: `📹 *${anime.title}* S${seasonNum} E${epNum}`
          })
        });
      } catch {}
    }
    return;
  }

  if (msg.video || msg.document) {
    const file = msg.video || msg.document;
    const fileId = file.file_id;
    const streamUrl = `${origin}/api/stream/${fileId}`;

    if (text.startsWith('/ep')) {
      const parts = text.split(' ');
      parts.shift();

      if (parts.length < 3) {
        await sendTelegramMessage(botToken, chatId, `
❌ *Invalid Caption Format!*
Format: \`/ep <anime_id> <season_num> <ep_num> [quality] <Episode Title>\`
Example: \`/ep anime_12345 1 1 1080p Episode 1 Title\`
        `);
        return;
      }

      const animeId = parts[0];
      const seasonNum = parseInt(parts[1]) || 1;
      const epNum = parseInt(parts[2]) || 1;

      let quality = '1080p';
      let titleStartIdx = 3;

      if (parts[3] && ['480p', '720p', '1080p', '360p', '4k'].includes(parts[3].toLowerCase())) {
        quality = parts[3];
        titleStartIdx = 4;
      }

      const epTitle = parts.slice(titleStartIdx).join(' ') || `Episode ${epNum}`;

      const catalog = await getCatalog(env);
      const anime = (catalog.anime || []).find(a => a.id === animeId);

      if (!anime) {
        await sendTelegramMessage(botToken, chatId, `❌ Anime with ID \`${animeId}\` not found! Use \`/listanime\` to check IDs.`);
        return;
      }

      let season = anime.seasons?.find(s => s.season_number === seasonNum);
      if (!season) {
        season = {
          id: `s${seasonNum}_${animeId}`,
          anime_id: animeId,
          season_number: seasonNum,
          title: `Season ${seasonNum}`,
          description: `Season ${seasonNum}`,
          is_published: true,
          episodes: []
        };
        anime.seasons = anime.seasons || [];
        anime.seasons.push(season);
      }

      season.episodes = season.episodes || [];
      let episode = season.episodes.find(e => e.episode_number === epNum);

      if (!episode) {
        episode = {
          id: `ep_${seasonNum}_${epNum}_${Date.now()}`,
          anime_id: animeId,
          season_id: season.id,
          episode_number: epNum,
          title: epTitle,
          description: `${anime.title} Season ${seasonNum} Episode ${epNum}`,
          duration_seconds: file.duration || 1440,
          thumbnail_url: anime.poster_url,
          stream_url: streamUrl,
          telegram_file_id: fileId,
          quality: quality,
          view_count: 0,
          is_published: true,
          distribution_rights_confirmed: true,
          video_assets: []
        };
        season.episodes.push(episode);
      } else {
        episode.title = epTitle || episode.title;
      }

      episode.video_assets = episode.video_assets || [];
      const assetIdx = episode.video_assets.findIndex(va => va.quality === quality);
      const newAsset = {
        id: `va_${quality}_${Date.now()}`,
        parent_type: 'episode',
        parent_id: episode.id,
        quality: quality,
        storage_key: fileId,
        stream_url: streamUrl,
        telegram_file_id: fileId,
        duration_seconds: file.duration || 1440,
        file_size_bytes: file.file_size || 0
      };

      if (assetIdx >= 0) {
        episode.video_assets[assetIdx] = newAsset;
      } else {
        episode.video_assets.push(newAsset);
      }

      // If requested quality is 1080p or default, update primary episode stream_url
      if (quality === '1080p' || !episode.stream_url) {
        episode.stream_url = streamUrl;
        episode.telegram_file_id = fileId;
        episode.quality = quality;
      }

      await saveCatalog(env, catalog);

      await sendTelegramMessage(botToken, chatId, `
🎉 *Episode (${quality}) Saved to Cloudflare!*

• Anime: *${anime.title}*
• Season ${seasonNum} | Episode ${epNum}: *${episode.title}*
• Quality Added: *${quality}*
• Stream Link: \`${streamUrl}\`

Live on mini-app/website! Video forward karne ke liye command use karein:
\`/forward ${animeId} ${seasonNum} ${epNum}\`
      `);
      return;
    }

    await sendTelegramMessage(botToken, chatId, `
📹 *Video File Received!*

Episode ko save karne ke liye video par reply karein ya caption ke saath bhejien:
\`/ep <anime_id> <season_num> <ep_num> [480p|720p|1080p] <Episode Title>\`

*Stream Link Generated:*
\`${streamUrl}\`
    `);
    return;
  }
}

const NEON_CONN_STRING = "postgresql://neondb_owner:npg_UaFhV4xQkoK3@ep-dry-shadow-ayej0k9w-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
const NEON_SQL_URL = "https://ep-dry-shadow-ayej0k9w.c-5.us-east-2.aws.neon.tech/sql";

async function queryNeon(env, sql, params = []) {
  const connStr = (env && (env.DATABASE_URL || env.POSTGRES_URL)) || NEON_CONN_STRING;
  const res = await fetch(NEON_SQL_URL, {
    method: 'POST',
    headers: {
      'neon-connection-string': connStr,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql, params })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Neon SQL error: ${res.status} ${errText}`);
  }
  return await res.json();
}

async function getCatalog(env) {
  try {
    const result = await queryNeon(env, "SELECT data FROM public.stark_catalog WHERE id = 'master_catalog';");
    if (result.rows && result.rows.length > 0 && result.rows[0].data) {
      return result.rows[0].data;
    }
  } catch (err) {
    console.error('[Worker] Error reading Neon DB:', err);
  }
  if (env && env.STARK_ANIME_KV) {
    try {
      const data = await env.STARK_ANIME_KV.get('catalog', { type: 'json' });
      if (data) return data;
    } catch {}
  }
  return MEMORY_STORE;
}

async function saveCatalog(env, catalog) {
  catalog.version = (catalog.version || 1) + 1;
  catalog.last_updated_at = new Date().toISOString();

  try {
    await queryNeon(
      env,
      "INSERT INTO public.stark_catalog (id, data, updated_at) VALUES ('master_catalog', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();",
      [JSON.stringify(catalog)]
    );
  } catch (err) {
    console.error('[Worker] Error saving to Neon DB:', err);
  }

  if (env && env.STARK_ANIME_KV) {
    try {
      await env.STARK_ANIME_KV.put('catalog', JSON.stringify(catalog));
    } catch {}
  }
  MEMORY_STORE = catalog;
  return catalog;
}

async function sendTelegramMessage(botToken, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
}
