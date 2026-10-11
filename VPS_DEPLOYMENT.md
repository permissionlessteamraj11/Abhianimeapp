# STARK ANIME — VPS Deployment & Video Management Guide (`main.py`)

Yeh guide aapko `main.py` ko kisi bhi **VPS (Ubuntu / Debian / CentOS)** par deploy karke waha se Anime, Seasons, Episodes, Movies manage aur direct Video Files Telegram par upload karne ka poora tarika bataati hai.

---

## 1. Quick Deploy on VPS (Single File)

VPS par `main.py` aur `.env` file setup karein:

```bash
# System Update & Dependencies Install
sudo apt update && sudo apt install -y python3 python3-pip python3-venv ffmpeg git

# Directory setup
mkdir -p /opt/stark-vps-manager && cd /opt/stark-vps-manager

# Virtual Environment setup:
python3 -m venv venv
source venv/bin/activate

# Install lightweight dependencies
pip install requests psycopg2-binary python-dotenv
```

---

## 2. Environment Variables Configuration (`.env`)

Create `.env` file in the same directory as `main.py`:

```env
STARK_API_URL=https://your-stark-app.vercel.app
ADMIN_TOKEN=offline_admin_rajpapa
DATABASE_URL=postgresql://neondb_owner:npg_UaFhV4xQkoK3@ep-dry-shadow-ayej0k9w-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require

TELEGRAM_BOT_TOKEN=8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ
TELEGRAM_API_ID=37729457
TELEGRAM_API_HASH=bb68973b7efcbbd074cda984c95502d6
TELEGRAM_CHANNEL_ID=@stark_anime_storage
```

---

## 3. Running Telegram Bot Mode (Recommended)

Telegram Bot run karne ke liye:

```bash
python3 main.py bot
# ya simply
python3 main.py
```

### 🤖 Telegram Bot Admin Panel Features:
1. **Interactive Menu Buttons (`/start` or `/menu`)**:
   - 🎬 **Manage Anime**: View anime list, episodes, add seasons, target anime for video upload, delete anime.
   - 🎥 **Manage Movies**: View movies, add movies, and delete movies with 1-click buttons.
   - 📤 **Video Upload Wizard**: Send any video or document file directly to the Telegram bot to instantly upload and stream in the Mini App.
   - 📊 **System Status**: Check live connection to Neon PostgreSQL & Vercel REST API.

2. **Direct Video Upload Caption Syntax**:
   Send any video file to the bot with caption:
   `Anime: anime_id | Season: 1 | Ep: 1 | Title: Episode Title`

---

## 4. Other Operating Modes

### Mode A: Interactive Terminal Menu

```bash
python3 main.py menu
```

Terminal Menu options:
1. List All Anime
2. Create New Anime
3. Add Season to Anime
4. Add Episode manually (with File ID / Stream URL)
5. Upload Video File from VPS to Telegram & Auto-add Episode
6. List Movies
7. Add Movie
8. Delete Anime / Movie / Episode
9. Test Database & API Connection

---

### Mode B: Direct CLI Commands

#### 1. List Anime:
```bash
python3 main.py list
```

#### 2. Create Anime:
```bash
python3 main.py add-anime --title "Solo Leveling Season 2" --poster "https://example.com/poster.jpg" --description "Arise!"
```

#### 3. Upload Local VPS Video File to Telegram & Add Episode:
```bash
python3 main.py upload-ep \
  --anime-id anime_1790672000 \
  --season 1 \
  --ep 1 \
  --file /home/ubuntu/videos/solo_ep1.mp4 \
  --title "Episode 1: The Awakening"
```

#### 4. Delete Anime or Movie:
```bash
python3 main.py del-anime --id anime_1790672000
python3 main.py del-movie --id movie_1790672000
```

---

## 5. Run Telegram Bot in Background (PM2 / Systemd)

PM2 se bot ko 24/7 background me chalane ke liye:

```bash
sudo npm install -g pm2
pm2 start "python3 main.py bot" --name stark-vps-bot
pm2 save
```

Enjoy complete remote anime management & direct video uploading from Telegram!
