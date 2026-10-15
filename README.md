# ⚡ STARK ANIME - Full VPS Deployment Guide & Master Architecture

STARK ANIME is a high-performance, mobile-optimized Anime & Movie streaming web application built with **React 19, Vite, Tailwind CSS v4, Express, and a Local Persistent JSON File Database**.

It comes with an integrated **VPS Video Transcoder Engine** and **Telegram Bot** that automatically downloads video uploads, converts them into YouTube-style multi-quality resolutions (1080p, 720p, 480p, 360p), and serves them seamlessly.

---

## 🌟 Key Architecture Highlights

1. **Entire Codebase & Backend on VPS:** Frontend, Backend REST API, Database, FFmpeg Transcoder, and Telegram Bot run 100% on your VPS.
2. **Neon DB Completely Removed:** No external database servers or cloud DB keys needed! All catalog state is stored locally and persisted safely in `data/stark_anime.db.json`.
3. **YouTube-Like Automatic Video Transcoding:**
   - Upload any video to your Telegram Admin Bot or VPS Console.
   - The bot automatically downloads the video on the VPS.
   - FFmpeg transcodes the video into **1080p, 720p, 480p, and 360p** MP4 formats with fast-start streaming headers.
   - The catalog updates automatically with multi-quality stream URLs.

---

## 🚀 Step-by-Step Complete VPS Deployment Guide (Ubuntu / Debian)

### Step 1: System Dependencies Installation
Connect to your Ubuntu VPS via SSH and install Node.js/Bun, Nginx, FFmpeg, and PM2:

```bash
# Update Ubuntu package manager
sudo apt update && sudo apt upgrade -y

# Install FFmpeg, Curl, Git, and Nginx
sudo apt install -y curl git nginx ffmpeg build-essential

# Install Bun runtime (Recommended for speed)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install PM2 globally
npm install -g pm2
```

---

### Step 2: Clone Codebase & Install Application
```bash
# Clone your repository onto the VPS
git clone <YOUR_GIT_REPOSITORY_URL> /var/www/stark-anime
cd /var/www/stark-anime

# Install dependencies using Bun
bun install

# Build production frontend assets
bun run build
```

---

### Step 3: Configure Environment Variables
Create a `.env` file in the repository root (`/var/www/stark-anime/.env`):

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=stark_super_secure_jwt_secret_key_2026
ADMIN_TOKEN=offline_admin_rajpapa

# Telegram Bot Credentials
TELEGRAM_BOT_TOKEN=8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ
TELEGRAM_CHANNEL_ID=@stark_anime_storage

# Persistent Local Database File Path
DB_FILE_PATH=/var/www/stark-anime/data/stark_anime.db.json
```

---

### Step 4: Start Web Server & Telegram Bot with PM2

```bash
# Start STARK Web Backend & Frontend Static Server
pm2 start "bun run server.ts" --name "stark-web"

# Start STARK Python Telegram Bot & Transcoder Engine
pm2 start "python3 main.py bot" --name "stark-bot"

# Save PM2 process list so it restarts automatically on server reboot
pm2 save
pm2 startup
```

---

### Step 5: Nginx Reverse Proxy & Domain Setup

Create Nginx site configuration file `/etc/nginx/sites-available/stark`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com; # Replace with your IP or Domain

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Enable Range Header handling for smooth video seeking
    location /uploads/ {
        alias /var/www/stark-anime/data/uploads/;
        add_header Access-Control-Allow-Origin *;
        add_header Accept-Ranges bytes;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/stark /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🤖 Telegram Bot Commands & Video Upload Workflow

Send videos directly to your Telegram Admin Bot to automatically generate 1080p, 720p, 480p, and 360p resolutions:

1. Send `/addanime Naruto Shippuden` to create a series.
2. Send any video file to the bot with caption:
   `Anime: <anime_id> | Season: 1 | Ep: 1 | Title: The Beginning`
3. The bot will download the video on VPS, FFmpeg will transcode it into 4 qualities, and instantly sync it to the web app player!

---

## 🔑 Default Credentials

- **Admin Route:** `/admin`
- **Username:** `rajpapa` or `admin`
- **Password:** `28@Rajpapa`
