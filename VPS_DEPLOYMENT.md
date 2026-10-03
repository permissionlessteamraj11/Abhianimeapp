# STARK ANIME — VPS Deployment & Video Management Guide (`main.py`)

Yeh guide aapko `main.py` ko kisi bhi **VPS (Ubuntu / Debian / CentOS)** par deploy karke waha se Anime, Seasons, Episodes, Movies manage aur direct Video Files Telegram par upload karne ka poora tarika bataati hai.

---

## 1. System Setup on VPS

VPS par login karne ke baad Python 3 aur virtual environment setup karein:

```bash
# System Update & Dependencies Install
sudo apt update && sudo apt install -y python3 python3-pip python3-venv ffmpeg git

# Project directory me aao ya create karo
mkdir -p /opt/stark-vps-manager && cd /opt/stark-vps-manager

# main.py aur requirements.txt copy karo
# Virtual Environment setup karein:
python3 -m venv venv
source venv/bin/activate

# Install Python requirements
pip install -r requirements.txt
```

---

## 2. Environment Variables Configuration (`.env`)

Environment variables setup karne ke liye:

Create `.env` file in the same directory:

```env
STARK_API_URL=https://your-stark-app.vercel.app
ADMIN_TOKEN=offline_admin_rajpapa
DATABASE_URL=postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-sample.neon.tech/neondb?sslmode=require

TELEGRAM_BOT_TOKEN=8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ
TELEGRAM_API_ID=37729457
TELEGRAM_API_HASH=bb68973b7efcbbd074cda984c95502d6
TELEGRAM_CHANNEL_ID=@stark_anime_storage
```

---

## 3. Usage & Management Modes

### Mode A: Interactive Console (Terminal Menu)

Easy terminal interface open karne ke liye:

```bash
python3 main.py
# ya
python3 main.py menu
```

Terminal me options:
1. List All Anime
2. Create New Anime
3. Add Season to Anime
4. Add Episode manually (with File ID / Stream URL)
5. Upload Video File from VPS to Telegram & Auto-add Episode
6. List Movies
7. Add Movie
8. Test Database & API Connection

---

### Mode B: Direct CLI Commands (Automation & Scripts)

Single command se upload aur manage karein:

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

#### 4. Add Episode with existing Telegram File ID:
```bash
python3 main.py add-ep \
  --anime-id anime_1790672000 \
  --season 1 \
  --ep 2 \
  --title "Episode 2" \
  --file-id "BAACAgUAAxkBAA..."
```

---

## 4. Run as Background Process (PM2 / Systemd)

PM2 se run karne ke liye:

```bash
sudo npm install -g pm2
pm2 start "python3 main.py menu" --name stark-vps-manager
pm2 save
```

Enjoy complete remote anime management & direct video uploading from VPS!
