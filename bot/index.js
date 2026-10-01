/**
 * Stark Anime - Standalone Node.js / Bun Telegram Bot Runner (Long Polling Mode)
 * Bot Token: 8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ
 * API ID: 37729457 | API Hash: bb68973b7efcbbd074cda984c95502d6
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ";
const PORT = process.env.BOT_PORT || 3005;
const DB_PATH = path.resolve('data/stark_anime.db.json');

console.log("=================================================");
console.log("🚀 Starting Stark Anime Telegram Bot Engine...");
console.log(`• Bot Token: ${BOT_TOKEN.slice(0, 12)}...`);
console.log(`• Local Port: ${PORT}`);
console.log("=================================================");

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading DB:', err);
  }
  return { version: 1, anime: [], movies: [], hero_banners: [] };
}

function saveDb(db) {
  try {
    db.version = (db.version || 1) + 1;
    db.last_updated_at = new Date().toISOString();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB:', err);
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
⚡ *Stark Anime - Episode Upload Bot (Local Node Engine)*

Welcome! Is bot se aap Anime Series, Seasons aur Episodes upload kar sakte ho.

*Commands:*
• \`/addanime <Title>\` - Create new Anime
• \`/listanime\` - List Anime Series
• \`/status\` - Database status

*Upload Video:*
Video bhejte waqt caption me likhein:
\`/ep <anime_id> <season_num> <ep_num> <Episode Title>\`
    `);
    return;
  }

  if (text.startsWith('/status')) {
    const db = loadDb();
    let totalEps = 0;
    (db.anime || []).forEach(a => {
      a.seasons?.forEach(s => {
        totalEps += s.episodes?.length || 0;
      });
    });

    await sendTelegramMessage(chatId, `
📊 *Stark Anime Storage Status*
• Anime Series: *${db.anime?.length || 0}*
• Movies: *${db.movies?.length || 0}*
• Episodes: *${totalEps}*
• Database Version: *v${db.version || 1}*
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

    const db = loadDb();
    db.anime = db.anime || [];
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

    db.anime.push(newAnime);
    saveDb(db);

    await sendTelegramMessage(chatId, `
✅ *Anime Series Created!*
• Title: *${title}*
• Anime ID: \`${animeId}\`

Now upload video files with caption:
\`/ep ${animeId} 1 1 Episode 1 Title\`
    `);
    return;
  }

  if (text.startsWith('/listanime')) {
    const db = loadDb();
    const animeList = db.anime || [];
    if (animeList.length === 0) {
      await sendTelegramMessage(chatId, "ℹ️ No anime in catalog. Create one with \`/addanime <Title>\`.");
      return;
    }

    let out = "📺 *Anime List:*\n\n";
    animeList.forEach((a, i) => {
      const epCount = a.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
      out += `${i + 1}. *${a.title}*\n   • ID: \`${a.id}\`\n   • Episodes: ${epCount}\n\n`;
    });

    await sendTelegramMessage(chatId, out);
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
        await sendTelegramMessage(chatId, "❌ Caption format: `/ep <anime_id> <season_num> <ep_num> <Episode Title>`");
        return;
      }

      const animeId = parts[0];
      const seasonNum = parseInt(parts[1]) || 1;
      const epNum = parseInt(parts[2]) || 1;
      const epTitle = parts.slice(3).join(' ') || `Episode ${epNum}`;

      const db = loadDb();
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
      const epId = `ep_${seasonNum}_${epNum}_${Date.now()}`;
      const newEpisode = {
        id: epId,
        anime_id: animeId,
        season_id: season.id,
        episode_number: epNum,
        title: epTitle,
        description: `${anime.title} S${seasonNum} E${epNum}`,
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

      saveDb(db);

      await sendTelegramMessage(chatId, `
🎉 *Episode Uploaded Successfully!*
• Anime: *${anime.title}*
• Season ${seasonNum} | Episode ${epNum}: *${epTitle}*
• Episode live on website!
      `);
      return;
    }

    await sendTelegramMessage(chatId, `
📹 *Video File Received!*
To attach to anime, reply with caption:
\`/ep <anime_id> <season_num> <ep_num> <Episode Title>\`
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
  res.end(JSON.stringify({ status: 'active', bot_token: BOT_TOKEN.slice(0, 10) + '...' }));
});

server.listen(PORT, () => {
  console.log(`[Stark Anime Bot] Running and listening for Telegram updates!`);
});
