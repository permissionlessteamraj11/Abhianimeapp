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
      return new Response(JSON.stringify({ success: true, webhookUrl, telegram_response: data }), {
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

    return new Response(JSON.stringify({
      status: "online",
      name: "Stark Anime Telegram Bot & Cloudflare Storage Engine",
      bot_token: botToken.slice(0, 10) + "...",
      api_id: DEFAULT_API_ID,
      endpoints: {
        set_webhook: `${url.origin}/set-webhook`,
        webhook: `${url.origin}/webhook`,
        catalog: `${url.origin}/api/catalog`
      }
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
⚡ *Stark Anime - Episode Upload Bot*

Welcome! Is bot se aap Anime Series, Seasons aur Episodes direct upload & control kar sakte ho. All data Cloudflare Storage par save hoga.

*Available Commands:*
• \`/addanime <Title>\` - Naya Anime banayein
• \`/listanime\` - Sabhi Anime series list karein
• \`/addseason <AnimeID> <SeasonNumber> [Title]\` - Season banayein
• \`/episodes <AnimeID>\` - Anime ke episodes dekhein
• \`/deleteepisode <AnimeID> <SeasonID> <EpisodeID>\` - Episode delete karein
• \`/status\` - Database stats dekhein

*Video Uploading:*
Kisi bhi video file ya document ko bot me send karein aur caption me aise likhein:
\`/ep <anime_id> <season_num> <ep_num> <Episode Title>\`
    `);
    return;
  }

  if (text.startsWith('/status')) {
    const catalog = await getCatalog(env);
    let totalEps = 0;
    catalog.anime.forEach(a => {
      a.seasons?.forEach(s => {
        totalEps += s.episodes?.length || 0;
      });
    });

    await sendTelegramMessage(botToken, chatId, `
📊 *Cloudflare Storage Status*
• Total Anime: *${catalog.anime.length}*
• Total Movies: *${catalog.movies.length}*
• Total Episodes: *${totalEps}*
• Catalog Version: *v${catalog.version || 1}*
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
• Default Season: \`Season 1\` (\`s1_${animeId}\`)

Ab episode upload karne ke liye video bhejien. Caption:
\`/ep ${animeId} 1 1 Episode 1 Title\`
    `);
    return;
  }

  if (text.startsWith('/listanime')) {
    const catalog = await getCatalog(env);
    if (catalog.anime.length === 0) {
      await sendTelegramMessage(botToken, chatId, "ℹ️ Koi Anime nahi hai. \`/addanime <Title>\` se pehle anime create karein.");
      return;
    }

    let msgText = "📺 *Anime Catalog List:*\n\n";
    catalog.anime.forEach((a, idx) => {
      const epCount = a.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
      msgText += `${idx + 1}. *${a.title}*\n   • ID: \`${a.id}\`\n   • Seasons: ${a.seasons?.length || 0} | Episodes: ${epCount}\n\n`;
    });

    await sendTelegramMessage(botToken, chatId, msgText);
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
Format: \`/ep <anime_id> <season_num> <ep_num> <Episode Title>\`
Example: \`/ep anime_1790000 1 1 The Beginning\`
        `);
        return;
      }

      const animeId = parts[0];
      const seasonNum = parseInt(parts[1]) || 1;
      const epNum = parseInt(parts[2]) || 1;
      const epTitle = parts.slice(3).join(' ') || `Episode ${epNum}`;

      const catalog = await getCatalog(env);
      const anime = catalog.anime.find(a => a.id === animeId);

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
      const epId = `ep_${seasonNum}_${epNum}_${Date.now()}`;
      const newEpisode = {
        id: epId,
        anime_id: animeId,
        season_id: season.id,
        episode_number: epNum,
        title: epTitle,
        description: `${anime.title} Season ${seasonNum} Episode ${epNum}`,
        duration_seconds: file.duration || 1440,
        thumbnail_url: anime.poster_url,
        stream_url: streamUrl,
        telegram_file_id: fileId,
        view_count: 0,
        is_published: true,
        distribution_rights_confirmed: true
      };

      const existingIdx = season.episodes.findIndex(e => e.episode_number === epNum);
      if (existingIdx >= 0) {
        season.episodes[existingIdx] = newEpisode;
      } else {
        season.episodes.push(newEpisode);
      }

      await saveCatalog(env, catalog);

      await sendTelegramMessage(botToken, chatId, `
🎉 *Episode Added & Saved to Cloudflare!*

• Anime: *${anime.title}*
• Season: *${seasonNum}* | Episode: *${epNum}*
• Title: *${epTitle}*
• Stream URL: \`${streamUrl}\`

Episode live ho gaya hai website/mini-app par! 🚀
      `);
      return;
    }

    await sendTelegramMessage(botToken, chatId, `
📹 *Video File Received!*

Episode ko catalog me save karne ke liye video par reply karein ya caption ke saath bhejien:
\`/ep <anime_id> <season_num> <ep_num> <Episode Title>\`

*Stream Link Generated:*
\`${streamUrl}\`
    `);
    return;
  }
}

async function getCatalog(env) {
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
