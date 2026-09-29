# KuroStream — Production Architecture & Deployment Guide

## A. Complete Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TELEGRAM CLIENTS                         │
│   (Android WebApp / iOS WebApp / Desktop / Web Client)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             EDGE CDN & REVERSE PROXY (Nginx)                │
│  - SSL Termination / HTTP/2                                 │
│  - Static Asset Caching                                     │
│  - Rate Limiting (100 req/min per IP)                       │
│  - Content-Disposition: inline (Anti-Download Policy)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              KUROSTREAM BACKEND (Node.js / Express)         │
│  - Telegram WebApp initData HMAC-SHA256 Validation          │
│  - Content Classification & NSFW Ban Filter                 │
│  - Distribution Rights Verification Engine                  │
│  - Ephemeral Signed Stream Token Generator (4hr expiry)     │
│  - 3-Column Session-Entropy Recommendation Engine           │
│  - Multi-tiered Global Full-Text Search Engine              │
│  - Admin RBAC & Immutable Audit Log System                  │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      PERSISTENCE LAYER       │ │  AUTHORIZED MEDIA STORAGE  │
│ - PostgreSQL 14+ (Metadata)  │ │ - Cloudflare R2 / AWS S3   │
│ - Redis 7 (Tokens & Cache)   │ │ - Signed Playback URLs     │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## B. Folder Structure

```
├── /database
│   ├── schema.sql              # Complete PostgreSQL DDL (foreign keys & indexes)
│   └── migrations.sql          # Initial seed migration (categories, settings, admin)
├── /src
│   ├── /assets/images          # High-fidelity generated anime art
│   ├── /components
│   │   ├── AdminModal.tsx      # Comprehensive /admin management suite
│   │   ├── AnimeDetailsModal.tsx # Series details with Season & Episode selector
│   │   ├── BottomNavigation.tsx  # Exactly 3 items: Home, Saved, Profile
│   │   ├── CategoryTabs.tsx    # Dynamic horizontal category navigation
│   │   ├── ContentCard.tsx     # Card with unboxed metadata & save button
│   │   ├── ContentRow.tsx      # Dynamic single-row sections (New Episodes, Trending)
│   │   ├── Header.tsx          # Top bar with wordmark & search trigger
│   │   ├── HeroCarousel.tsx    # 5-banner carousel with swipe & auto-play
│   │   ├── LegalModals.tsx     # Privacy, Terms, DMCA Takedown Form
│   │   ├── MovieDetailsModal.tsx # Feature films with related recommendations
│   │   ├── ProfileView.tsx     # Verified Telegram identity & watch history
│   │   ├── RecommendationGrid.tsx # 3-column mobile grid [A][B][C] variations
│   │   ├── SavedView.tsx       # 3-column grid with ⋮ Remove menu
│   │   ├── SearchModal.tsx     # Global debounced search
│   │   ├── Toast.tsx           # User feedback toasts
│   │   └── VideoPlayerModal.tsx# Custom mobile video player with multi-quality
│   ├── /lib
│   │   ├── api.ts              # Typed client API service
│   │   └── telegram.ts         # Telegram WebApp SDK bindings & haptic feedback
│   ├── /types
│   │   └── index.ts            # Type interfaces and entities
│   ├── App.tsx                 # Root application controller
│   ├── index.css               # Tailwind CSS & safe area insets
│   └── main.tsx                # React DOM entry point
├── server.ts                   # Express full-stack backend with Vite middleware
├── .env.example                # Full environment variable template
├── metadata.json               # AI Studio project configuration
└── package.json
```

---

## C. Database ER Diagram

```
 [users] 1 ────────── ∞ [saved_items] ∞ ────────── 1 [anime] / [movies]
    │                                                      │ 1
    │ 1                                                    │
    │                                                      │ ∞
    └── ∞ [watch_progress]                               [seasons]
               │                                           │ 1
               │                                           │
               └────────────────────────────────────────── ∞ [episodes]
                                                           │ 1
                                                           │
                                                           │ ∞
                                                     [video_assets]
                                                     [subtitle_tracks]
                                                     [audio_tracks]

 [admins] 1 ────────── ∞ [admin_audit_logs]
 [admins] 1 ────────── ∞ [admin_sessions]
 [copyright_claims] (Status: pending -> under_review -> content_taken_down)
 [app_settings] (Key/Value JSONB store)
```

---

## D. API Specification Summary

### Public & User Endpoints
- `GET /api/home` — Dynamic feed (banners, categories, populated sections, settings)
- `GET /api/categories` — Active category tabs
- `GET /api/anime/:id` — Anime details, seasons, and episodes
- `GET /api/movies/:id` — Movie details and assets
- `GET /api/search?q=&cat=` — Full-text multi-field search (Exact > Prefix > Alt > Genre)
- `GET /api/recommendations?limit=9` — 3-column mobile recommendation engine
- `POST /api/stream/playback-token` — Signs temporary 4-hour playback token
- `GET /api/stream/token/:token` — Validates signature/expiry and serves streaming media
- `GET /api/saved` — User library items
- `POST /api/saved` — Add to user library
- `DELETE /api/saved/:type/:id` — Remove from user library
- `GET /api/history` — User watch progress
- `POST /api/history/progress` — Record playback timestamp & completion %
- `DELETE /api/history` — Clear playback history
- `GET /api/profile` — Verified Telegram identity & stats
- `DELETE /api/profile/data` — GDPR / Privacy compliance data erasure
- `POST /api/compliance/copyright-claim` — Formal DMCA takedown submission
- `POST /api/compliance/report` — User content flag

### Administrator Endpoints
- `POST /api/admin/login` — Authenticate admin credentials
- `POST /api/admin/logout` — Revoke admin token
- `GET /api/admin/dashboard` — Platform stats, active streams, views, and audit log
- `GET / POST / DELETE /api/admin/anime` — Anime CRUD with rights confirmation
- `GET / POST / DELETE /api/admin/movies` — Movie CRUD with rights confirmation
- `POST / DELETE /api/admin/anime/:id/seasons` — Season management
- `POST / DELETE /api/admin/anime/:id/seasons/:sId/episodes` — Episode management
- `GET / POST / DELETE /api/admin/hero-banners` — Hero carousel management
- `GET / POST / DELETE /api/admin/homepage-sections` — Sections management
- `GET /api/admin/users` — User management
- `POST /api/admin/users/:id/suspend` — Suspend/restore user
- `GET / PATCH /api/admin/copyright-claims/:id` — DMCA claim review & takedown
- `GET /api/admin/audit-logs` — Immutable audit logs
- `GET / POST /api/admin/settings` — Platform configuration & maintenance mode toggle

---

## E. Authentication Flow

```
User opens Telegram Bot -> Clicks Mini App Button
  │
  ├─► Telegram Client attaches cryptographically signed initData
  │
  ├─► Client passes initData in headers to /api/profile
  │
  ├─► Backend validates HMAC-SHA256 signature using TELEGRAM_BOT_TOKEN
  │
  └─► User profile synced automatically with zero friction
```

---

## F. Video Processing & Anti-Piracy Flow

1. **Ingestion**: Admin uploads authorized media to private S3/R2 bucket with segmented qualities (144p up to 4K).
2. **Distribution Rights Confirmation**: Required administrator confirmation ("I confirm that I own or have authorization to distribute this content.") before publishing.
3. **Classification Check**: Content classification enforced; adult (18+ NSFW) content is strictly blocked.
4. **Playback Request**: Client requests stream token from `/api/stream/playback-token`.
5. **Signed Token Generation**: Backend generates a temporary HMAC-SHA256 signed token valid for 4 hours.
6. **Streaming**: Media is streamed inline with no download headers, preventing permanent URL sharing.

---

## G. Production Deployment Instructions (Ubuntu / Debian VPS)

### 1. System Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm postgresql redis-server nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

### 2. Database Setup
```bash
sudo -u postgres psql
CREATE DATABASE kurostream;
CREATE USER kuro WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE kurostream TO kuro;
\q

# Apply schema and initial migrations
psql -U kuro -d kurostream -f database/schema.sql
psql -U kuro -d kurostream -f database/migrations.sql
```

### 3. Application Deployment
```bash
git clone <repo_url> /var/www/kurostream
cd /var/www/kurostream
cp .env.example .env
# Edit .env with your production credentials
npm install
npm run build
pm2 start "npm run start" --name kurostream
pm2 save
pm2 startup
```

### 4. Nginx Reverse Proxy Configuration
```nginx
server {
    server_name kurostream.yourdomain.com;

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
}
```

### 5. SSL Certificate
```bash
sudo certbot --nginx -d kurostream.yourdomain.com
```
