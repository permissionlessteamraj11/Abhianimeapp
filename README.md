# ⚡ STARK ANIME - Production Streaming Platform

STARK (shortened from STARK ANIME) is a full-stack, production-ready Anime & Feature Film Streaming Web Application & Telegram Mini App powered by **React 19, Vite, Tailwind CSS v4, Express, Neon PostgreSQL, FFmpeg HLS Transcoder, and Nginx Media Gateway**.

---

## 📐 Architecture Overview

```
                      ┌─────────────────────┐
                      │ Telegram Admin Bot  │
                      └──────────┬──────────┘
                                 │ Forward Video
                                 ▼
                      ┌─────────────────────┐
                      │ VPS Telegram Worker │
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │ Original Media Disk │
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │    FFmpeg Worker    │
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │       HLS           │
                      │ master.m3u8          │
                      │ 1080p/720p/480p/360p│
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │ Nginx Media Gateway │
                      │ HTTPS + Auth + CORS │
                      └──────────┬──────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────┐
│                 VERCEL WEB APP                     │
│                                                    │
│ Existing UI / Telegram Mini App                    │
│ Anime pages & Watch Progress                       │
│ Admin Panel (/raj)                                 │
└──────────────────────┬─────────────────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Neon PostgreSQL  │
              └──────────────────┘
```

---

## 🌟 Key Features

1. **Locked Original Frontend Design:** Preserves slate dark theme (`slate-950`, `slate-900`) and cyan accent (`cyan-500`, `cyan-400`).
2. **Adaptive Bitrate HLS Streaming:** Generates multi-quality `master.m3u8` playlists (1080p, 720p, 480p, 360p) using FFmpeg with H.264/AAC compatibility.
3. **Telegram Admin Console & Video Ingestion:** Full inline keyboard administration system with direct video file forwarding and automatic episode attachment.
4. **Local Telegram Bot API Support:** Supports unlimited file downloads and large video uploads up to 2000 MB (2 GB).
5. **Signed Playback Security:** Generates short-lived HMAC SHA-256 tokens to prevent hotlinking and direct public video scraping.
6. **Watch Progress & Resume:** Automatically saves viewing timestamps every 10–15 seconds and prompts viewers to continue watching.
7. **Admin Panel (/raj):** Advanced web administration suite for series, seasons, episodes, movies, user moderation, database backups, and live device broadcasts.
8. **Google Sheets Sync:** Dual-tab export and import for batch catalog management via Google Drive.

---

## 📁 Directory Structure

```
.
├── api/                    # Vercel Serverless Function entry point
├── bot/                    # Telegram Bot Console
│   ├── index.js            # Standalone Node/Bun long-polling bot
│   └── worker.js           # Cloudflare Worker Telegram bot handler
├── database/               # Database Schema & Migrations
│   ├── schema.sql          # Normalized PostgreSQL tables
│   └── migrations.sql      # Seed data & app settings
├── deploy/                 # Production VPS Deployment Configurations
│   ├── nginx/
│   │   └── anime-media.conf# Nginx Media Gateway & SSL configuration
│   ├── scripts/
│   │   └── backup.sh       # Automated backup & recovery script
│   ├── systemd/
│   │   ├── anime-bot.service
│   │   ├── anime-media-api.service
│   │   └── anime-worker.service
│   └── telegram-api/
│       └── telegram-bot-api.service
├── public/                 # Static assets (Logos, favicons)
├── server/                 # Express backend database engine & state
├── src/                    # Frontend React 19 application
│   ├── components/         # UI components & modals
│   ├── lib/                # API, Google Auth, Sheets, Telegram WebApp
│   └── types/              # TypeScript interfaces
├── main.py                 # Python VPS worker & FFmpeg HLS transcoder
├── server.ts               # Express API server
├── package.json
└── README.md
```

---

## 🛠️ Environment Variables (.env)

```env
# Application & API
PORT=3000
NODE_ENV=production
JWT_SECRET=your_secure_random_jwt_signing_key_2026

# Neon PostgreSQL Connection
DATABASE_URL=postgresql://neondb_owner:npg_UaFhV4xQkoK3@ep-dry-shadow-ayej0k9w-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require

# Telegram Admin Bot
TELEGRAM_BOT_TOKEN=8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ
TELEGRAM_ADMIN_IDS=849204812,123456789
TELEGRAM_API_ID=37729457
TELEGRAM_API_HASH=bb68973b7efcbbd074cda984c95502d6
TELEGRAM_CHANNEL_ID=@stark_anime_storage

# VPS Storage & Media Server
VPS_MEDIA_ROOT=/srv/anime-media
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
HLS_SEGMENT_TIME=6
MAX_CONCURRENT_JOBS=2
```

---

## 🚀 Step-by-Step Deployment Guide

### 1. Vercel Deployment (Web Application)

1. Connect GitHub repository to Vercel.
2. Vercel automatically detects `vercel.json`.
3. Add Environment Variables (`DATABASE_URL`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`).
4. Click **Deploy**.

---

### 2. VPS Media Server Setup (Ubuntu / Debian)

#### Step 1: Update & Install System Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv ffmpeg nginx certbot python3-certbot-nginx git
```

#### Step 2: Create Storage Directories
```bash
sudo mkdir -p /srv/anime-media/originals
sudo mkdir -p /srv/anime-media/hls
sudo mkdir -p /srv/anime-media/thumbnails
sudo mkdir -p /srv/anime-media/temp
sudo mkdir -p /srv/anime-media/failed
sudo chmod -R 755 /srv/anime-media
```

#### Step 3: Setup Project & Python Virtual Environment
```bash
git clone <your-repo-url> /opt/stark-vps-manager
cd /opt/stark-vps-manager

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
bun install
```

---

### 3. Nginx Media Gateway Configuration

Copy Nginx config and enable site:
```bash
sudo cp deploy/nginx/anime-media.conf /etc/nginx/sites-available/anime-media.conf
sudo ln -s /etc/nginx/sites-available/anime-media.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Setup SSL with Certbot:
```bash
sudo certbot --nginx -d media.stark-anime.com
```

---

### 4. Local Telegram Bot API Server (Large File Download up to 2GB)

To bypass standard 50MB HTTP download limits:
```bash
# Install telegram-bot-api binary or Docker container
sudo cp deploy/telegram-api/telegram-bot-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now telegram-bot-api
```

---

### 5. Systemd Services Setup

```bash
sudo cp deploy/systemd/anime-worker.service /etc/systemd/system/
sudo cp deploy/systemd/anime-bot.service /etc/systemd/system/
sudo cp deploy/systemd/anime-media-api.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now anime-worker
sudo systemctl enable --now anime-bot
sudo systemctl enable --now anime-media-api
```

---

## 🎬 First Episode Upload Tutorial

### Step 1: Open Telegram Admin Bot
Send `/start` or `/admin` to your Telegram bot.

### Step 2: Create Anime Series
Run:
```
/addanime Solo Leveling
```

### Step 3: Forward Video File to Bot
Forward or upload your `.m4v` / `.mkv` / `.mp4` video file directly to the Telegram bot with caption:
```
/ep anime_1790672000 1 1 1080p Episode 1: Arise
```

### Step 4: Verify & Play
Open the Web App or Mini App. Episode 1 will appear in 1080p, 720p, 480p with signed streaming security!

---

## 🔑 Default Admin Credentials

- **Admin Secret Route:** Append `/raj` to URL in browser.
- **Username:** `rajpapa` or `admin`
- **Password:** `28@Rajpapa`

---

## 📊 Monitoring & Troubleshooting Commands

```bash
# Check service status
systemctl status anime-worker
systemctl status anime-bot
systemctl status nginx

# View live logs
journalctl -u anime-worker -f
journalctl -u anime-bot -f
tail -f /var/log/nginx/stark_media_error.log

# Disk & Storage Usage
df -h
du -sh /srv/anime-media/*
```

---

## 📄 License
Commercial distribution strictly reserved under STARK ANIME license rights.
