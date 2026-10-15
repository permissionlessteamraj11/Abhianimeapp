# 🚀 STARK ANIME - VPS Deployment Guide (Full Standalone Setup)

This guide covers setting up **STARK ANIME** completely on a single Ubuntu / Debian VPS.

---

## 📋 System Requirements

- **OS:** Ubuntu 22.04 LTS or Debian 12
- **CPU:** 2+ Cores (Recommended for FFmpeg transcoding)
- **RAM:** 2GB+ RAM
- **Storage:** 20GB+ SSD (For storing local database & transcoded videos)

---

## 🛠️ Step 1: Install VPS System Dependencies

```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Essential Tools, Nginx, and FFmpeg
sudo apt install -y curl git nginx ffmpeg build-essential

# Install Bun Runtime
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install PM2 Process Manager
npm install -g pm2
```

---

## 📦 Step 2: Clone & Prepare Project

```bash
# Clone Repository
git clone <your-repo-url> /var/www/stark-anime
cd /var/www/stark-anime

# Install Bun Dependencies
bun install

# Build Production Frontend Assets
bun run build
```

---

## ⚙️ Step 3: Environment Setup

Create `.env` file in `/var/www/stark-anime/.env`:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=stark_vps_secret_key_2026
ADMIN_TOKEN=offline_admin_rajpapa

# Telegram Bot Token
TELEGRAM_BOT_TOKEN=8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ

# Persistent JSON Database Location
DB_FILE_PATH=/var/www/stark-anime/data/stark_anime.db.json
```

---

## 🔄 Step 4: Run Application Services with PM2

```bash
cd /var/www/stark-anime

# 1. Start STARK Web Server (Express + Vite Static Serve)
pm2 start "bun run server.ts" --name "stark-web"

# 2. Start STARK Telegram Admin Bot & Transcoder Engine
pm2 start "python3 main.py bot" --name "stark-bot"

# Save PM2 state for automatic startup on reboot
pm2 save
pm2 startup
```

---

## 🌐 Step 5: Nginx Reverse Proxy Setup

Create file `/etc/nginx/sites-available/stark`:

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

    client_max_body_size 1000M;

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

    location /uploads/ {
        alias /var/www/stark-anime/data/uploads/;
        add_header Access-Control-Allow-Origin *;
        add_header Accept-Ranges bytes;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/stark /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🎬 How Telegram Video Auto-Transcoding Works

1. Send `/addanime Solo Leveling` to your Telegram Bot.
2. Upload any video file to the Telegram Bot with caption:
   `Anime: <anime_id> | Season: 1 | Ep: 1 | Title: Episode Title`
3. The bot will automatically:
   - Download the file on VPS.
   - Use FFmpeg to encode 360p, 480p, 720p, and 1080p MP4 videos with fast streaming headers.
   - Attach all stream URLs to the episode in `data/stark_anime.db.json`.
4. Players can immediately switch qualities during video playback!
