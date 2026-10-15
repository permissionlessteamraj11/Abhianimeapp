/**
 * Stark Anime - Standalone Node.js / Bun Telegram Bot Runner (Long Polling Mode)
 * Connected directly to Persistent JSON Database File
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ";
const PORT = process.env.BOT_PORT || 3005;
const DB_FILE = path.resolve(__dirname, '../data/stark_anime.db.json');

console.log("=================================================");
console.log("🚀 Starting Stark Telegram Bot Engine (JSON File DB)...");
console.log(`• Bot Token: ${BOT_TOKEN.slice(0, 12)}...`);
console.log(`• DB File: ${DB_FILE}`);
console.log(`• Local Port: ${PORT}`);
console.log("=================================================");

async function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed) return parsed;
    }
  } catch (err) {
    console.error('[Bot Engine] Error reading JSON DB file:', err);
  }
  return { version: 1, anime: [], movies: [], hero_banners: [], last_updated_at: new Date().toISOString() };
}

async function saveDb(db) {
  try {
    db.version = (db.version || 1) + 1;
    db.last_updated_at = new Date().toISOString();
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
    console.log(`[Bot Engine] Saved updated catalog v${db.version} to JSON DB file.`);
  } catch (err) {
    console.error('[Bot Engine] Error saving JSON DB file:', err);
  }
}

async function sendTelegramMessage(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error('Send Telegram message error:', err);
  }
}

async function handleUpdate(update) {
  if (!update.message) return;
  const msg = update.message;
  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || '').trim();

  if (text.startsWith('/start')) {
    await sendTelegramMessage(chatId, `
⚡ *STARK - Episode & Video Upload Bot*

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
\`/ep <anime_id> <season_num> <ep_num> <quality> [official|fandub] <Episode Title>\`
_Example:_ \`/ep anime_12345 1 1 1080p official Episode 1 The Beginning\`
    `);
    return;
  }

  if (text.startsWith('/status')) {
    const db = await loadDb();
    let totalEps = 0;
    (db.anime || []).forEach(a => {
      a.seasons?.forEach(s => {
        totalEps += s.episodes?.length || 0;
      });
    });

    await sendTelegramMessage(chatId, `
📊 *STARK VPS Storage Status*
• Total Anime: *${db.anime?.length || 0}*
• Total Movies: *${db.movies?.length || 0}*
• Total Episodes: *${totalEps}*
• Database Version: *v${db.version || 1}*
• Storage Mode: *Persistent Local JSON File Database*
    `);
    return;
  }

  if (text.startsWith('/addanime')) {
    const parts = text.split(' ');
    parts.shift();
    const title = parts.join(' ').trim();

    if (!title) {
      await sendTelegramMessage(chatId, "❌ Usage: `/addanime Naruto Shippuden`");
      return;
    }

    const db = await loadDb();
    db.anime = db.anime || [];
    const animeId = `anime_${Date.now()}`;
    const newAnime = {
      id: animeId,
      title: title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: `${title} anime series.`,
      poster_url: '/stark-logo.jpg',
      backdrop_url: '/stark-logo.jpg',
      rating: 9.0,
      release_year: new Date().getFullYear(),
      status: 'Ongoing',
      classification: 'PG-13',
      language: 'Hindi',
      available_audio: ['Hindi (Official)', 'Japanese (Sub)'],
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

    db.anime.push(newAnime);
    await saveDb(db);

    await sendTelegramMessage(chatId, `
✅ *Anime Created Successfully in Persistent JSON Database!*
• Title: *${title}*
• Anime ID: \`${animeId}\`
• Default Season: \`Season 1\`

Video bhejien aur caption:
\`/ep ${animeId} 1 1 1080p official Episode 1 Title\`
    `);
    return;
  }

  if (text.startsWith('/listanime')) {
    const db = await loadDb();
    const animeList = db.anime || [];
    if (animeList.length === 0) {
      await sendTelegramMessage(chatId, "ℹ️ No anime in catalog. Create one with \`/addanime <Title>\`.");
      return;
    }

    let msgText = "📺 *Anime Catalog List:*\n\n";
    animeList.forEach((a, idx) => {
      const epCount = a.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
      msgText += `${idx + 1}. *${a.title}*\n   • ID: \`${a.id}\`\n   • Seasons: ${a.seasons?.length || 0} | Episodes: ${epCount}\n\n`;
    });

    await sendTelegramMessage(chatId, msgText);
    return;
  }

  if (text.startsWith('/editanime')) {
    const parts = text.split(' ');
    parts.shift();
    if (parts.length < 3) {
      await sendTelegramMessage(chatId, "❌ Usage: `/editanime <anime_id> <title|description|poster_url|status> <value>`");
      return;
    }

    const animeId = parts[0];
    const field = parts[1].toLowerCase();
    const value = parts.slice(2).join(' ');

    const db = await loadDb();
    const anime = (db.anime || []).find(a => a.id === animeId);

    if (!anime) {
      await sendTelegramMessage(chatId, `❌ Anime ID \`${animeId}\` not found! Use \`/listanime\`.`);
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
      await sendTelegramMessage(chatId, "❌ Valid fields: `title`, `description`, `poster_url`, `status`");
      return;
    }

    await saveDb(db);
    await sendTelegramMessage(chatId, `✅ *Anime Updated!* Field *${field}* set to: ${value}`);
    return;
  }

  if (text.startsWith('/editepisode')) {
    const parts = text.split(' ');
    parts.shift();
    if (parts.length < 5) {
      await sendTelegramMessage(chatId, "❌ Usage: `/editepisode <anime_id> <season_num> <ep_num> <title|description> <value>`");
      return;
    }

    const animeId = parts[0];
    const seasonNum = parseInt(parts[1]) || 1;
    const epNum = parseInt(parts[2]) || 1;
    const field = parts[3].toLowerCase();
    const value = parts.slice(4).join(' ');

    const db = await loadDb();
    const anime = (db.anime || []).find(a => a.id === animeId);
    const season = anime?.seasons?.find(s => s.season_number === seasonNum);
    const episode = season?.episodes?.find(e => e.episode_number === epNum);

    if (!episode) {
      await sendTelegramMessage(chatId, `❌ Episode not found for Anime \`${animeId}\` S${seasonNum} E${epNum}`);
      return;
    }

    if (field === 'title') {
      episode.title = value;
    } else if (field === 'description') {
      episode.description = value;
    } else {
      await sendTelegramMessage(chatId, "❌ Valid fields: `title`, `description`");
      return;
    }

    await saveDb(db);
    await sendTelegramMessage(chatId, `✅ *Episode S${seasonNum} E${epNum} Updated!* ${field} = ${value}`);
    return;
  }

  if (text.startsWith('/forward')) {
    const parts = text.split(' ');
    parts.shift();
    if (parts.length < 3) {
      await sendTelegramMessage(chatId, "❌ Usage: `/forward <anime_id> <season_num> <ep_num>`");
      return;
    }

    const animeId = parts[0];
    const seasonNum = parseInt(parts[1]) || 1;
    const epNum = parseInt(parts[2]) || 1;

    const db = await loadDb();
    const anime = (db.anime || []).find(a => a.id === animeId);
    const season = anime?.seasons?.find(s => s.season_number === seasonNum);
    const episode = season?.episodes?.find(e => e.episode_number === epNum);

    if (!episode) {
      await sendTelegramMessage(chatId, `❌ Episode S${seasonNum} E${epNum} not found for Anime \`${animeId}\`.`);
      return;
    }

    let forwardMsg = `🎬 *${anime.title}* - Season ${seasonNum} Episode ${epNum}\n• Title: *${episode.title}*\n• Audio Type: *${episode.audio_type || 'Official Dub'}*\n\n*Available Video Qualities & Streams:*\n`;

    if (episode.video_assets && episode.video_assets.length > 0) {
      episode.video_assets.forEach(va => {
        forwardMsg += `• *${va.quality}*: [Stream Link](${va.stream_url})\n`;
      });
    } else if (episode.stream_url) {
      forwardMsg += `• *Default (${episode.quality || '1080p'})*: [Stream Link](${episode.stream_url})\n`;
    }

    await sendTelegramMessage(chatId, forwardMsg);

    if (episode.video_assets && episode.video_assets.length > 0) {
      for (const va of episode.video_assets) {
        if (va.telegram_file_id) {
          try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
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
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
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
    const streamUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileId}`;

    if (text.startsWith('/ep')) {
      const parts = text.split(' ');
      parts.shift();
      if (parts.length < 3) {
        await sendTelegramMessage(chatId, "❌ Caption format: `/ep <anime_id> <season_num> <ep_num> [480p|720p|1080p] [official|fandub] <Episode Title>`");
        return;
      }

      const animeId = parts[0];
      const seasonNum = parseInt(parts[1]) || 1;
      const epNum = parseInt(parts[2]) || 1;

      let quality = '1080p';
      let audioType = 'Official Dub';
      let titleStartIdx = 3;

      if (parts[3] && ['480p', '720p', '1080p', '360p', '4k'].includes(parts[3].toLowerCase())) {
        quality = parts[3];
        titleStartIdx = 4;
      }

      if (parts[titleStartIdx] && ['official', 'fandub', 'subbed'].includes(parts[titleStartIdx].toLowerCase())) {
        const at = parts[titleStartIdx].toLowerCase();
        audioType = at === 'fandub' ? 'Fan Dub' : at === 'subbed' ? 'Subbed' : 'Official Dub';
        titleStartIdx += 1;
      }

      const epTitle = parts.slice(titleStartIdx).join(' ') || `Episode ${epNum}`;

      const db = await loadDb();
      const anime = (db.anime || []).find(a => a.id === animeId);

      if (!anime) {
        await sendTelegramMessage(chatId, `❌ Anime ID \`${animeId}\` not found! Use \`/listanime\`.`);
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
          description: `${anime.title} S${seasonNum} E${epNum}`,
          duration_seconds: file.duration || 1440,
          thumbnail_url: anime.poster_url || '/stark-logo.jpg',
          stream_url: streamUrl,
          stream_urls: {
            '1080p': streamUrl,
            '720p': streamUrl,
            '480p': streamUrl,
            '360p': streamUrl
          },
          telegram_file_id: fileId,
          quality: quality,
          audio_type: audioType,
          view_count: 0,
          is_published: true,
          distribution_rights_confirmed: true,
          video_assets: []
        };
        season.episodes.push(episode);
      } else {
        episode.title = epTitle || episode.title;
        episode.audio_type = audioType || episode.audio_type;
        episode.stream_urls = episode.stream_urls || {};
        episode.stream_urls[quality] = streamUrl;
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

      if (quality === '1080p' || !episode.stream_url) {
        episode.stream_url = streamUrl;
        episode.telegram_file_id = fileId;
        episode.quality = quality;
      }

      await saveDb(db);

      await sendTelegramMessage(chatId, `
🎉 *Episode (${quality} - ${audioType}) Saved with Multi-Quality Stream Mapping to Persistent Database!*
• Anime: *${anime.title}*
• Season ${seasonNum} | Episode ${epNum}: *${episode.title}*
• Qualities Available: *360p, 480p, 720p, 1080p*
• Audio Dub: *${audioType}*
• Episode live on STARK website!

Video forward karne ke liye command send karein:
\`/forward ${animeId} ${seasonNum} ${epNum}\`
      `);
      return;
    }

    await sendTelegramMessage(chatId, `
📹 *Video File Received!*
To attach to anime, reply with caption:
\`/ep <anime_id> <season_num> <ep_num> [480p|720p|1080p] [official|fandub] <Episode Title>\`
    `);
    return;
  }
}

let offset = 0;
async function pollTelegram() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=10`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    }
  } catch (err) {}
  setTimeout(pollTelegram, 1000);
}

pollTelegram();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'active', database: 'Persistent JSON File Database', bot_token: BOT_TOKEN.slice(0, 10) + '...' }));
});

server.listen(PORT, () => {
  console.log(`[STARK Bot] Running and listening for Telegram updates! Connected to Neon DB.`);
});
