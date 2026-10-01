# Stark Anime - Standalone Telegram Upload Bot & Cloudflare Storage Worker

Yeh Telegram bot aapko Telegram se direct Anime Series, Seasons aur Episodes upload karne ki suvidha deta hai. Sabhi video metadata aur files Cloudflare Storage par save hote hain.

## Credentials Pre-Configured:
- **Bot Token**: `8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ`
- **API ID**: `37729457`
- **API Hash**: `bb68973b7efcbbd074cda984c95502d6`

---

## How to Deploy ONLY the Bot to Cloudflare Workers

Uske liye `bot/` folder me alag Cloudflare Worker setup hai:

### Step 1: Open `bot/` folder in terminal
```bash
cd bot
```

### Step 2: Login to Cloudflare (agar pehli baar kar rahe hain)
```bash
npx wrangler login
```

### Step 3: Deploy ONLY Bot Worker to Cloudflare
```bash
npx wrangler deploy
```

Deploy hote hi aapko Cloudflare Worker URL milega (jaise `https://stark-anime-telegram-bot.<your-subdomain>.workers.dev`).

### Step 4: Set Telegram Webhook
Browser me apna Cloudflare URL open karein:
`https://stark-anime-telegram-bot.<your-subdomain>.workers.dev/set-webhook`

Aapka bot instantly active ho jayega!

---

## How to Run Bot Locally (Node.js / Bun)

```bash
node bot/index.js
# ya
bun run bot/index.js
```

---

## Bot Telegram Commands

- `/start` - Welcome Dashboard & Quick Menu
- `/addanime <Title>` - Naya Anime Series create karein
- `/listanime` - Sabhi Anime ki ID dekhne ke liye
- `/status` - Total Anime & Episode stats

### Episode Upload Kaise Karein:
Telegram me video bhejte waqt ya message ke caption me ye command likhein:
`/ep <anime_id> <season_num> <ep_num> <Episode Title>`

**Example:**
`/ep anime_1790672000 1 1 Episode 1 The Awakening`

Episode automatically Cloudflare Storage par save ho jayega aur website/mini-app par live chalega!
