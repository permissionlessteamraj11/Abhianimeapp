#!/usr/bin/env python3
"""
=============================================================================
STARK ANIME - VPS CONTENT MANAGEMENT & TELEGRAM BOT (main.py)
=============================================================================
This script runs standalone on a VPS (Ubuntu/Debian) to:
 1. Connect directly to Neon PostgreSQL or STARK Admin REST API.
 2. Manage Anime, Seasons, Episodes, and Movies (Create, Read, Update, Delete).
 3. Provide an Interactive Telegram Admin Panel with buttons & callbacks.
 4. Handle direct video uploads from Telegram with automatic catalog sync.
 5. Upload local video files directly from VPS to Telegram channels.
 6. Provide CLI, Interactive Terminal Menu, and Telegram Bot modes.
=============================================================================
"""

import os
import sys
import json
import time
import argparse
import asyncio
from typing import Dict, List, Any, Optional

# Third-party imports with fallback handling
try:
    import requests
except ImportError:
    requests = None

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Environment Configuration
STARK_API_URL = os.getenv("STARK_API_URL", "http://localhost:3000")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "offline_admin_rajpapa")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_UaFhV4xQkoK3@ep-dry-shadow-ayej0k9w-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ")
TELEGRAM_API_ID = os.getenv("TELEGRAM_API_ID", "37729457")
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "bb68973b7efcbbd074cda984c95502d6")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "")

# ---------------------------------------------------------------------------
# Database & API Operations Class
# ---------------------------------------------------------------------------
class StarkManager:
    def __init__(self, api_url: str = STARK_API_URL, admin_token: str = ADMIN_TOKEN, db_url: str = DATABASE_URL):
        self.api_url = api_url.rstrip('/')
        self.admin_token = admin_token
        self.db_url = db_url

    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.admin_token}",
            "x-admin-token": self.admin_token,
            "x-admin-password": "28@Rajpapa"
        }

    # --- Neon Direct PostgreSQL Helpers ---
    def get_catalog_from_db(self) -> Optional[Dict[str, Any]]:
        if not self.db_url or not psycopg2:
            return None
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT data FROM public.stark_catalog WHERE id = 'master_catalog';")
            row = cur.fetchone()
            cur.close()
            conn.close()
            if row and row.get('data'):
                return row['data']
        except Exception as e:
            print(f"[DB Warning] Direct DB fetch failed: {e}")
        return None

    def save_catalog_to_db(self, catalog_data: Dict[str, Any]) -> bool:
        if not self.db_url or not psycopg2:
            return False
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            catalog_json = json.dumps(catalog_data)
            cur.execute("""
                INSERT INTO public.stark_catalog (id, data, updated_at)
                VALUES ('master_catalog', %s, NOW())
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
            """, (catalog_json,))
            conn.commit()
            cur.close()
            conn.close()
            return True
        except Exception as e:
            print(f"[DB Error] Direct DB save failed: {e}")
            return False

    # --- REST API Helpers ---
    def api_get(self, endpoint: str) -> Optional[Any]:
        if not requests:
            return None
        try:
            res = requests.get(f"{self.api_url}{endpoint}", headers=self._headers(), timeout=10)
            if res.status_code == 200:
                return res.json()
            else:
                print(f"[API Error] GET {endpoint} returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[API Connection Error] {e}")
        return None

    def api_post(self, endpoint: str, payload: Dict[str, Any]) -> Optional[Any]:
        if not requests:
            return None
        try:
            res = requests.post(f"{self.api_url}{endpoint}", headers=self._headers(), json=payload, timeout=15)
            if res.status_code in (200, 201):
                return res.json()
            else:
                print(f"[API Error] POST {endpoint} returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[API Connection Error] {e}")
        return None

    def api_delete(self, endpoint: str) -> bool:
        if not requests:
            return False
        try:
            res = requests.delete(f"{self.api_url}{endpoint}", headers=self._headers(), timeout=10)
            return res.status_code in (200, 204)
        except Exception as e:
            print(f"[API Connection Error] {e}")
        return False

    # --- Content Management Methods ---
    def list_anime(self) -> List[Dict[str, Any]]:
        res = self.api_get("/api/admin/anime")
        if res is not None and isinstance(res, list):
            return res
        catalog = self.get_catalog_from_db()
        if catalog and "anime" in catalog:
            return catalog["anime"]
        return []

    def get_anime_by_id(self, anime_id: str) -> Optional[Dict[str, Any]]:
        all_anime = self.list_anime()
        for a in all_anime:
            if a.get("id") == anime_id or a.get("slug") == anime_id:
                return a
        return None

    def save_anime(self, anime_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if "id" not in anime_data or not anime_data["id"]:
            anime_data["id"] = f"anime-{int(time.time())}"
        if "slug" not in anime_data or not anime_data["slug"]:
            anime_data["slug"] = anime_data.get("title", anime_data["id"]).lower().replace(" ", "-")

        res = self.api_post("/api/admin/anime", anime_data)
        if res:
            print(f"✓ Anime '{anime_data.get('title')}' saved successfully via API.")
            return res

        catalog = self.get_catalog_from_db()
        if catalog is not None:
            if "anime" not in catalog:
                catalog["anime"] = []
            idx = next((i for i, a in enumerate(catalog["anime"]) if a.get("id") == anime_data["id"]), -1)
            if idx >= 0:
                catalog["anime"][idx] = {**catalog["anime"][idx], **anime_data}
            else:
                catalog["anime"].append(anime_data)
            if self.save_catalog_to_db(catalog):
                print(f"✓ Anime '{anime_data.get('title')}' saved directly to Neon DB.")
                return anime_data
        return None

    def delete_anime(self, anime_id: str) -> bool:
        if self.api_delete(f"/api/admin/anime/{anime_id}"):
            print(f"✓ Anime '{anime_id}' deleted via API.")
            return True

        catalog = self.get_catalog_from_db()
        if catalog and "anime" in catalog:
            initial_len = len(catalog["anime"])
            catalog["anime"] = [a for a in catalog["anime"] if a.get("id") != anime_id]
            if len(catalog["anime"]) < initial_len:
                if self.save_catalog_to_db(catalog):
                    print(f"✓ Anime '{anime_id}' deleted directly from Neon DB.")
                    return True
        return False

    def add_season(self, anime_id: str, season_number: int, title: Optional[str] = None) -> Optional[Dict[str, Any]]:
        season_payload = {
            "id": f"s-{int(time.time())}",
            "season_number": season_number,
            "title": title or f"Season {season_number}",
            "description": f"Season {season_number}",
            "is_published": True,
            "episodes": []
        }

        res = self.api_post(f"/api/admin/anime/{anime_id}/seasons", season_payload)
        if res:
            print(f"✓ Season {season_number} added to Anime '{anime_id}' via API.")
            return season_payload

        catalog = self.get_catalog_from_db()
        if catalog:
            anime = next((a for a in catalog.get("anime", []) if a.get("id") == anime_id), None)
            if anime:
                if "seasons" not in anime or not isinstance(anime["seasons"], list):
                    anime["seasons"] = []
                anime["seasons"].append(season_payload)
                if self.save_catalog_to_db(catalog):
                    print(f"✓ Season {season_number} saved to Neon DB.")
                    return season_payload
        return None

    def delete_season(self, anime_id: str, season_id: str) -> bool:
        if self.api_delete(f"/api/admin/anime/{anime_id}/seasons/{season_id}"):
            print(f"✓ Season '{season_id}' deleted via API.")
            return True

        catalog = self.get_catalog_from_db()
        if catalog:
            anime = next((a for a in catalog.get("anime", []) if a.get("id") == anime_id), None)
            if anime and "seasons" in anime:
                init_len = len(anime["seasons"])
                anime["seasons"] = [s for s in anime["seasons"] if s.get("id") != season_id]
                if len(anime["seasons"]) < init_len:
                    if self.save_catalog_to_db(catalog):
                        print(f"✓ Season '{season_id}' deleted from Neon DB.")
                        return True
        return False

    def add_episode(self, anime_id: str, season_id_or_num: Any, episode_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        anime = self.get_anime_by_id(anime_id)
        if not anime:
            print(f"Error: Anime ID '{anime_id}' not found.")
            return None

        seasons = anime.get("seasons", [])
        target_season = None

        if isinstance(season_id_or_num, int) or (isinstance(season_id_or_num, str) and season_id_or_num.isdigit()):
            s_num = int(season_id_or_num)
            target_season = next((s for s in seasons if s.get("season_number") == s_num), None)
            if not target_season:
                print(f"Season {s_num} not found. Creating Season {s_num}...")
                target_season = self.add_season(anime_id, s_num)
        else:
            target_season = next((s for s in seasons if s.get("id") == season_id_or_num), None)

        season_id = target_season.get("id") if target_season else f"s-{season_id_or_num}"

        ep_id = episode_data.get("id") or f"ep-{int(time.time())}"
        ep_num = episode_data.get("episode_number") or 1
        ep_payload = {
            "id": ep_id,
            "episode_number": ep_num,
            "title": episode_data.get("title") or f"Episode {ep_num}",
            "description": episode_data.get("description", ""),
            "thumbnail_url": episode_data.get("thumbnail_url", anime.get("poster_url", "")),
            "duration_seconds": episode_data.get("duration_seconds", 1440),
            "stream_url": episode_data.get("stream_url", ""),
            "telegram_file_id": episode_data.get("telegram_file_id", ""),
            "stream_urls": episode_data.get("stream_urls", {}),
            "is_published": True
        }

        res = self.api_post(f"/api/admin/anime/{anime_id}/seasons/{season_id}/episodes", ep_payload)
        if res:
            print(f"✓ Episode {ep_num} ('{ep_payload['title']}') saved via API.")
            return ep_payload

        catalog = self.get_catalog_from_db()
        if catalog:
            for a in catalog.get("anime", []):
                if a.get("id") == anime_id:
                    for s in a.get("seasons", []):
                        if s.get("id") == season_id or s.get("season_number") == season_id_or_num:
                            if "episodes" not in s:
                                s["episodes"] = []
                            idx = next((i for i, e in enumerate(s["episodes"]) if e.get("id") == ep_id), -1)
                            if idx >= 0:
                                s["episodes"][idx] = {**s["episodes"][idx], **ep_payload}
                            else:
                                s["episodes"].append(ep_payload)
                            if self.save_catalog_to_db(catalog):
                                print(f"✓ Episode {ep_num} saved directly to Neon DB.")
                                return ep_payload
        return None

    def delete_episode(self, anime_id: str, season_id: str, episode_id: str) -> bool:
        if self.api_delete(f"/api/admin/anime/{anime_id}/seasons/{season_id}/episodes/{episode_id}"):
            print(f"✓ Episode '{episode_id}' deleted via API.")
            return True

        catalog = self.get_catalog_from_db()
        if catalog:
            for a in catalog.get("anime", []):
                if a.get("id") == anime_id:
                    for s in a.get("seasons", []):
                        if s.get("id") == season_id:
                            if "episodes" in s:
                                init_len = len(s["episodes"])
                                s["episodes"] = [e for e in s["episodes"] if e.get("id") != episode_id]
                                if len(s["episodes"]) < init_len:
                                    if self.save_catalog_to_db(catalog):
                                        print(f"✓ Episode '{episode_id}' deleted from Neon DB.")
                                        return True
        return False

    def list_movies(self) -> List[Dict[str, Any]]:
        res = self.api_get("/api/admin/movies")
        if res is not None and isinstance(res, list):
            return res
        catalog = self.get_catalog_from_db()
        if catalog and "movies" in catalog:
            return catalog["movies"]
        return []

    def save_movie(self, movie_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if "id" not in movie_data or not movie_data["id"]:
            movie_data["id"] = f"movie-{int(time.time())}"
        res = self.api_post("/api/admin/movies", movie_data)
        if res:
            print(f"✓ Movie '{movie_data.get('title')}' saved via API.")
            return res

        catalog = self.get_catalog_from_db()
        if catalog:
            if "movies" not in catalog:
                catalog["movies"] = []
            catalog["movies"].append(movie_data)
            if self.save_catalog_to_db(catalog):
                print(f"✓ Movie '{movie_data.get('title')}' saved to Neon DB.")
                return movie_data
        return None

    def delete_movie(self, movie_id: str) -> bool:
        if self.api_delete(f"/api/admin/movies/{movie_id}"):
            print(f"✓ Movie '{movie_id}' deleted via API.")
            return True

        catalog = self.get_catalog_from_db()
        if catalog and "movies" in catalog:
            init_len = len(catalog["movies"])
            catalog["movies"] = [m for m in catalog["movies"] if m.get("id") != movie_id]
            if len(catalog["movies"]) < init_len:
                if self.save_catalog_to_db(catalog):
                    print(f"✓ Movie '{movie_id}' deleted from Neon DB.")
                    return True
        return False


# ---------------------------------------------------------------------------
# Telegram Uploader Module (Bot API)
# ---------------------------------------------------------------------------
class TelegramUploader:
    def __init__(self, bot_token: str = TELEGRAM_BOT_TOKEN, chat_id: str = TELEGRAM_CHANNEL_ID):
        self.bot_token = bot_token
        self.chat_id = chat_id

    def upload_via_bot_api(self, file_path: str, caption: str = "") -> Optional[Dict[str, Any]]:
        """Uploads a video file up to 50MB via standard Telegram Bot API HTTP request."""
        if not requests:
            print("[Error] 'requests' module required for Bot API upload.")
            return None

        if not os.path.exists(file_path):
            print(f"[Error] File not found: {file_path}")
            return None

        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        if file_size_mb > 50:
            print(f"[Notice] File size is {file_size_mb:.1f}MB (> 50MB limit for HTTP Bot API).")

        url = f"https://api.telegram.org/bot{self.bot_token}/sendVideo"
        target_chat = self.chat_id or "@stark_anime_storage"

        print(f"Uploading '{os.path.basename(file_path)}' ({file_size_mb:.1f} MB) to Telegram target '{target_chat}'...")

        try:
            with open(file_path, 'rb') as video_file:
                files = {'video': video_file}
                data = {'chat_id': target_chat, 'caption': caption, 'supports_streaming': True}
                res = requests.post(url, files=files, data=data, timeout=300)
                if res.status_code == 200:
                    result = res.json().get('result', {})
                    video_info = result.get('video', {})
                    file_id = video_info.get('file_id')
                    print(f"✓ Upload successful! Telegram File ID: {file_id}")
                    return {
                        "file_id": file_id,
                        "file_size": video_info.get("file_size"),
                        "duration": video_info.get("duration"),
                        "width": video_info.get("width"),
                        "height": video_info.get("height")
                    }
                else:
                    print(f"[Telegram Upload Error] {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[Telegram Exception] {e}")
        return None


# ---------------------------------------------------------------------------
# Interactive Terminal CLI Menu
# ---------------------------------------------------------------------------
def run_interactive_menu():
    manager = StarkManager()
    uploader = TelegramUploader()

    while True:
        print("\n" + "=" * 60)
        print("          STARK ANIME - VPS MANAGEMENT CONSOLE         ")
        print("=" * 60)
        print(" 1. List All Anime")
        print(" 2. Create New Anime")
        print(" 3. Add Season to Anime")
        print(" 4. Add Episode to Anime (with Video Link/File ID)")
        print(" 5. Upload Video File from VPS to Telegram & Add Episode")
        print(" 6. List Movies")
        print(" 7. Add Movie")
        print(" 8. Delete Anime / Movie / Episode")
        print(" 9. Test Database & API Connection")
        print(" 0. Exit")
        print("=" * 60)

        choice = input("Select an option [0-9]: ").strip()

        if choice == "1":
            anime_list = manager.list_anime()
            print(f"\nTotal Anime found: {len(anime_list)}")
            for idx, a in enumerate(anime_list, 1):
                ep_count = sum(len(s.get("episodes", [])) for s in a.get("seasons", []))
                print(f" {idx}. [{a.get('id')}] {a.get('title')} - Seasons: {len(a.get('seasons', []))}, Total Eps: {ep_count}")

        elif choice == "2":
            print("\n--- Create New Anime ---")
            title = input("Anime Title: ").strip()
            if not title:
                print("Title cannot be empty.")
                continue
            poster_url = input("Poster Image URL (or press Enter for default): ").strip()
            backdrop_url = input("Backdrop Image URL (or press Enter for default): ").strip()
            desc = input("Description: ").strip()
            genres_raw = input("Genres (comma separated, e.g. Action, Fantasy): ").strip()
            genres = [g.strip() for g in genres_raw.split(",")] if genres_raw else ["Action"]

            anime_payload = {
                "title": title,
                "poster_url": poster_url or "/images/poster_chrono_blade.jpg",
                "backdrop_url": backdrop_url or "/images/hero_cyber_samurai.jpg",
                "description": desc or f"Official series page for {title}",
                "genres": genres,
                "rating": 8.5,
                "release_year": 2025,
                "seasons": []
            }
            manager.save_anime(anime_payload)

        elif choice == "3":
            anime_id = input("Enter Anime ID: ").strip()
            s_num = input("Season Number (e.g. 1): ").strip()
            s_title = input("Season Title (optional): ").strip()
            if anime_id and s_num.isdigit():
                manager.add_season(anime_id, int(s_num), s_title or None)

        elif choice == "4":
            print("\n--- Add Episode ---")
            anime_id = input("Anime ID: ").strip()
            season_num = input("Season Number (e.g. 1): ").strip()
            ep_num = input("Episode Number (e.g. 1): ").strip()
            ep_title = input("Episode Title: ").strip()
            file_id = input("Telegram File ID (or stream URL): ").strip()

            if anime_id and ep_num.isdigit():
                ep_payload = {
                    "episode_number": int(ep_num),
                    "title": ep_title or f"Episode {ep_num}",
                    "telegram_file_id": file_id if not file_id.startswith("http") else "",
                    "stream_url": file_id if file_id.startswith("http") else "",
                    "stream_urls": {
                        "1080p": file_id,
                        "720p": file_id
                    } if file_id else {}
                }
                manager.add_episode(anime_id, int(season_num) if season_num.isdigit() else 1, ep_payload)

        elif choice == "5":
            print("\n--- Upload Video File from VPS ---")
            file_path = input("Path to video file on VPS (e.g. /home/video.mp4): ").strip()
            anime_id = input("Anime ID: ").strip()
            season_num = input("Season Number (e.g. 1): ").strip() or "1"
            ep_num = input("Episode Number (e.g. 1): ").strip() or "1"
            ep_title = input("Episode Title: ").strip()

            if not os.path.exists(file_path):
                print(f"Error: File '{file_path}' does not exist on VPS.")
                continue

            upload_res = uploader.upload_via_bot_api(file_path, f"Anime ID: {anime_id} | Ep {ep_num}")
            file_id = upload_res.get("file_id", "") if upload_res else ""

            ep_payload = {
                "episode_number": int(ep_num),
                "title": ep_title or f"Episode {ep_num}",
                "telegram_file_id": file_id,
                "stream_urls": {
                    "1080p": f"tg:{file_id}" if file_id else "",
                    "720p": f"tg:{file_id}" if file_id else ""
                }
            }
            manager.add_episode(anime_id, int(season_num), ep_payload)

        elif choice == "6":
            movies = manager.list_movies()
            print(f"\nTotal Movies found: {len(movies)}")
            for idx, m in enumerate(movies, 1):
                print(f" {idx}. [{m.get('id')}] {m.get('title')} ({m.get('release_year', 2025)})")

        elif choice == "7":
            title = input("Movie Title: ").strip()
            stream_url = input("Stream URL or Telegram File ID: ").strip()
            if title:
                m_payload = {
                    "title": title,
                    "stream_url": stream_url,
                    "poster_url": "/images/poster_chrono_blade.jpg",
                    "rating": 8.8,
                    "release_year": 2025
                }
                manager.save_movie(m_payload)

        elif choice == "8":
            print("\n--- Delete Content ---")
            print("a. Delete Anime")
            print("b. Delete Movie")
            del_type = input("Choice [a/b]: ").strip().lower()
            if del_type == "a":
                aid = input("Enter Anime ID to delete: ").strip()
                if aid and manager.delete_anime(aid):
                    print(f"✓ Anime '{aid}' deleted successfully.")
                else:
                    print(f"❌ Failed to delete anime '{aid}'.")
            elif del_type == "b":
                mid = input("Enter Movie ID to delete: ").strip()
                if mid and manager.delete_movie(mid):
                    print(f"✓ Movie '{mid}' deleted successfully.")
                else:
                    print(f"❌ Failed to delete movie '{mid}'.")

        elif choice == "9":
            print("\nTesting Connections...")
            print(f"Checking STARK API ({manager.api_url})...")
            api_res = manager.api_get("/api/home")
            if api_res:
                print(" ✓ STARK API connection: SUCCESS")
            else:
                print(" ✗ STARK API connection: FAILED")

            print(f"Checking Neon PostgreSQL DB...")
            db_res = manager.get_catalog_from_db()
            if db_res:
                print(" ✓ Neon DB connection: SUCCESS")
            else:
                print(" ✗ Neon DB connection: FAILED or DATABASE_URL not set")

        elif choice == "0":
            print("Exiting STARK Manager. Goodbye!")
            sys.exit(0)


# ---------------------------------------------------------------------------
# Active Telegram Bot Long-Polling Runner with Interactive Admin Panel
# ---------------------------------------------------------------------------
class StarkTelegramBotRunner:
    def __init__(self, token: str, manager: StarkManager):
        self.token = token
        self.manager = manager
        self.api_url = f"https://api.telegram.org/bot{token}"
        self.offset = 0
        self.user_states: Dict[int, Dict[str, Any]] = {}

    def api_call(self, method: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not requests:
            return None
        try:
            res = requests.post(f"{self.api_url}/{method}", json=payload, timeout=15)
            if res.status_code == 200:
                return res.json()
            else:
                print(f"[Bot API Call Error] {method} {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[Bot API Exception] {method}: {e}")
        return None

    def send_message(self, chat_id: int, text: str, reply_markup: Optional[Dict[str, Any]] = None, parse_mode: str = "HTML") -> Optional[Dict[str, Any]]:
        payload = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        return self.api_call("sendMessage", payload)

    def edit_message(self, chat_id: int, message_id: int, text: str, reply_markup: Optional[Dict[str, Any]] = None, parse_mode: str = "HTML"):
        payload = {"chat_id": chat_id, "message_id": message_id, "text": text, "parse_mode": parse_mode}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        return self.api_call("editMessageText", payload)

    def answer_callback(self, callback_id: str, text: str = "", show_alert: bool = False):
        self.api_call("answerCallbackQuery", {"callback_query_id": callback_id, "text": text, "show_alert": show_alert})

    # --- UI Keyboards ---
    def get_main_keyboard(self) -> Dict[str, Any]:
        return {
            "inline_keyboard": [
                [
                    {"text": "🎬 Manage Anime", "callback_data": "menu_anime"},
                    {"text": "🎥 Manage Movies", "callback_data": "menu_movies"}
                ],
                [
                    {"text": "📤 Video Upload Wizard", "callback_data": "menu_upload"},
                    {"text": "📊 System Status", "callback_data": "menu_status"}
                ],
                [
                    {"text": "➕ Quick Add Anime", "callback_data": "action_add_anime"},
                    {"text": "➕ Quick Add Movie", "callback_data": "action_add_movie"}
                ],
                [
                    {"text": "🔄 Refresh Catalog", "callback_data": "menu_main"}
                ]
            ]
        }

    def render_main_menu(self, chat_id: int, message_id: Optional[int] = None):
        anime_list = self.manager.list_anime()
        movies_list = self.manager.list_movies()
        total_eps = sum(sum(len(s.get("episodes", [])) for s in a.get("seasons", [])) for a in anime_list)

        text = (
            "⚡ <b>STARK ANIME - VPS ADMIN PANEL</b> ⚡\n"
            "<i>Manage your Mini App streaming catalog live from Telegram!</i>\n\n"
            "📊 <b>Catalog Summary:</b>\n"
            f"• <b>Anime Series:</b> {len(anime_list)}\n"
            f"• <b>Total Episodes:</b> {total_eps}\n"
            f"• <b>Movies:</b> {len(movies_list)}\n\n"
            "Select an action below:"
        )

        kb = self.get_main_keyboard()
        if message_id:
            self.edit_message(chat_id, message_id, text, kb)
        else:
            self.send_message(chat_id, text, kb)

    def handle_callback(self, callback: Dict[str, Any]):
        cb_id = callback.get("id")
        msg = callback.get("message", {})
        chat_id = msg.get("chat", {}).get("id")
        msg_id = msg.get("message_id")
        data = callback.get("data", "")

        if not chat_id:
            return

        self.answer_callback(cb_id)

        if data == "menu_main":
            self.render_main_menu(chat_id, msg_id)

        elif data == "menu_status":
            anime_list = self.manager.list_anime()
            movies_list = self.manager.list_movies()
            total_eps = sum(sum(len(s.get("episodes", [])) for s in a.get("seasons", [])) for a in anime_list)

            text = (
                "📊 <b>STARK Infrastructure Status</b>\n\n"
                f"<b>STARK REST API:</b> <code>{self.manager.api_url}</code>\n"
                f"<b>Neon Postgres DB:</b> {'🟢 Connected' if self.manager.db_url else '⚠️ Not Set'}\n\n"
                f"🎬 <b>Catalog Counters:</b>\n"
                f"• Anime Series: {len(anime_list)}\n"
                f"• Total Episodes: {total_eps}\n"
                f"• Feature Movies: {len(movies_list)}\n\n"
                "🟢 Active & synced with Vercel Mini App!"
            )
            kb = {"inline_keyboard": [[{"text": "🔙 Back to Main Menu", "callback_data": "menu_main"}]]}
            self.edit_message(chat_id, msg_id, text, kb)

        elif data == "menu_anime":
            anime_list = self.manager.list_anime()
            if not anime_list:
                text = "📁 <b>No Anime found in catalog.</b>"
                kb = {
                    "inline_keyboard": [
                        [{"text": "➕ Create Anime", "callback_data": "action_add_anime"}],
                        [{"text": "🔙 Back to Main Menu", "callback_data": "menu_main"}]
                    ]
                }
                self.edit_message(chat_id, msg_id, text, kb)
                return

            text = f"🎬 <b>ANIME SERIES ({len(anime_list)})</b>\nClick on any anime to view episodes, add seasons or delete:"
            buttons = []
            for a in anime_list[:10]:
                title = a.get("title", "Untitled")
                aid = a.get("id")
                ep_count = sum(len(s.get("episodes", [])) for s in a.get("seasons", []))
                buttons.append([{"text": f"📺 {title} ({ep_count} eps)", "callback_data": f"anime_{aid}"}])

            buttons.append([{"text": "➕ Create New Anime", "callback_data": "action_add_anime"}])
            buttons.append([{"text": "🔙 Back to Main Menu", "callback_data": "menu_main"}])
            self.edit_message(chat_id, msg_id, text, {"inline_keyboard": buttons})

        elif data.startswith("anime_"):
            aid = data.replace("anime_", "")
            anime = self.manager.get_anime_by_id(aid)
            if not anime:
                self.answer_callback(cb_id, "Anime not found!", show_alert=True)
                self.render_main_menu(chat_id, msg_id)
                return

            seasons = anime.get("seasons", [])
            total_eps = sum(len(s.get("episodes", [])) for s in seasons)

            text = (
                f"📺 <b>{anime.get('title')}</b>\n"
                f"<b>ID:</b> <code>{anime.get('id')}</code>\n"
                f"<b>Rating:</b> ⭐ {anime.get('rating', 8.5)} | <b>Year:</b> {anime.get('release_year', 2025)}\n"
                f"<b>Seasons:</b> {len(seasons)} | <b>Total Episodes:</b> {total_eps}\n"
                f"<b>Description:</b> {anime.get('description', '')[:120]}...\n"
            )

            buttons = []
            for s in seasons:
                s_num = s.get("season_number", 1)
                eps = s.get("episodes", [])
                buttons.append([{"text": f"📁 Season {s_num} ({len(eps)} episodes)", "callback_data": f"season_{aid}_{s.get('id')}"}])

            buttons.append([{"text": "➕ Add Season", "callback_data": f"add_season_{aid}"}])
            buttons.append([{"text": "📤 Target for Video Uploads", "callback_data": f"target_upload_{aid}"}])
            buttons.append([{"text": "🗑️ Delete This Anime", "callback_data": f"del_anime_{aid}"}])
            buttons.append([{"text": "🔙 Back to Anime List", "callback_data": "menu_anime"}])

            self.edit_message(chat_id, msg_id, text, {"inline_keyboard": buttons})

        elif data.startswith("target_upload_"):
            aid = data.replace("target_upload_", "")
            anime = self.manager.get_anime_by_id(aid)
            self.user_states[chat_id] = {"target_anime_id": aid}
            self.answer_callback(cb_id, f"Set target anime to {anime.get('title') if anime else aid}!", show_alert=True)
            text = (
                f"🎯 <b>Target Anime Selected!</b>\n"
                f"Target Anime: <b>{anime.get('title') if anime else aid}</b> (ID: <code>{aid}</code>)\n\n"
                "Now, send any video or document file to this bot.\n"
                "You can caption it with:\n"
                "<code>Season: 1 | Ep: 1 | Title: Episode Name</code>\n\n"
                "Or simply send the video file and the bot will ask for episode details!"
            )
            kb = {"inline_keyboard": [[{"text": "📺 Back to Anime", "callback_data": f"anime_{aid}"}]]}
            self.edit_message(chat_id, msg_id, text, kb)

        elif data.startswith("del_anime_"):
            aid = data.replace("del_anime_", "")
            anime = self.manager.get_anime_by_id(aid)
            title = anime.get("title", aid) if anime else aid

            if self.manager.delete_anime(aid):
                self.answer_callback(cb_id, f"Anime '{title}' deleted!", show_alert=True)
                self.render_main_menu(chat_id, msg_id)
            else:
                self.answer_callback(cb_id, "Failed to delete anime.", show_alert=True)

        elif data.startswith("add_season_"):
            aid = data.replace("add_season_", "")
            anime = self.manager.get_anime_by_id(aid)
            next_num = len(anime.get("seasons", [])) + 1 if anime else 1
            self.manager.add_season(aid, next_num)
            self.answer_callback(cb_id, f"Season {next_num} added!", show_alert=True)
            self.handle_callback({"id": cb_id, "message": msg, "data": f"anime_{aid}"})

        elif data.startswith("season_"):
            parts = data.split("_")
            if len(parts) >= 3:
                aid = parts[1]
                sid = parts[2]
                anime = self.manager.get_anime_by_id(aid)
                season = next((s for s in anime.get("seasons", []) if s.get("id") == sid), None) if anime else None

                if season:
                    eps = season.get("episodes", [])
                    text = (
                        f"📁 <b>{anime.get('title')} - Season {season.get('season_number', 1)}</b>\n"
                        f"Total Episodes: {len(eps)}\n\n"
                        "Episodes list:"
                    )
                    buttons = []
                    for e in eps[:15]:
                        ep_num = e.get("episode_number", 1)
                        ep_title = e.get("title", f"Ep {ep_num}")
                        ep_id = e.get("id")
                        buttons.append([
                            {"text": f"Ep {ep_num}: {ep_title}", "callback_data": f"epinfo_{aid}_{sid}_{ep_id}"},
                            {"text": "🗑️", "callback_data": f"delepid_{aid}_{sid}_{ep_id}"}
                        ])

                    buttons.append([{"text": "🗑️ Delete Season", "callback_data": f"del_season_{aid}_{sid}"}])
                    buttons.append([{"text": "🔙 Back to Anime", "callback_data": f"anime_{aid}"}])
                    self.edit_message(chat_id, msg_id, text, {"inline_keyboard": buttons})

        elif data.startswith("delepid_"):
            parts = data.split("_")
            if len(parts) >= 4:
                aid, sid, ep_id = parts[1], parts[2], parts[3]
                if self.manager.delete_episode(aid, sid, ep_id):
                    self.answer_callback(cb_id, "Episode deleted!", show_alert=True)
                    self.handle_callback({"id": cb_id, "message": msg, "data": f"season_{aid}_{sid}"})
                else:
                    self.answer_callback(cb_id, "Failed to delete episode.", show_alert=True)

        elif data.startswith("del_season_"):
            parts = data.split("_")
            if len(parts) >= 3:
                aid, sid = parts[1], parts[2]
                if self.manager.delete_season(aid, sid):
                    self.answer_callback(cb_id, "Season deleted!", show_alert=True)
                    self.handle_callback({"id": cb_id, "message": msg, "data": f"anime_{aid}"})

        elif data == "menu_movies":
            movies = self.manager.list_movies()
            text = f"🎥 <b>FEATURE MOVIES ({len(movies)})</b>\nManage or delete movies:"
            buttons = []
            for m in movies[:10]:
                mtitle = m.get("title", "Movie")
                mid = m.get("id")
                buttons.append([
                    {"text": f"🎬 {mtitle}", "callback_data": f"movieinfo_{mid}"},
                    {"text": "🗑️", "callback_data": f"del_movie_{mid}"}
                ])
            buttons.append([{"text": "➕ Add Movie", "callback_data": "action_add_movie"}])
            buttons.append([{"text": "🔙 Back to Main Menu", "callback_data": "menu_main"}])
            self.edit_message(chat_id, msg_id, text, {"inline_keyboard": buttons})

        elif data.startswith("del_movie_"):
            mid = data.replace("del_movie_", "")
            if self.manager.delete_movie(mid):
                self.answer_callback(cb_id, "Movie deleted!", show_alert=True)
                self.handle_callback({"id": cb_id, "message": msg, "data": "menu_movies"})

        elif data == "menu_upload":
            text = (
                "📤 <b>VIDEO UPLOAD WIZARD</b> 📤\n\n"
                "You can upload video files directly to this bot!\n\n"
                "<b>Method 1: Caption Syntax</b>\n"
                "Send any video file with a caption in this format:\n"
                "<code>Anime: <anime_id> | Season: 1 | Ep: 1 | Title: Episode Name</code>\n\n"
                "<b>Method 2: Target Selection</b>\n"
                "Select a target anime from <b>Manage Anime</b> menu first, then send any video file."
            )
            kb = {
                "inline_keyboard": [
                    [{"text": "🎯 Select Target Anime", "callback_data": "menu_anime"}],
                    [{"text": "🔙 Back to Main Menu", "callback_data": "menu_main"}]
                ]
            }
            self.edit_message(chat_id, msg_id, text, kb)

        elif data == "action_add_anime":
            self.user_states[chat_id] = {"state": "WAITING_ANIME_TITLE"}
            text = "🎬 <b>Create New Anime</b>\nPlease type the <b>Title</b> of the new anime series:"
            kb = {"inline_keyboard": [[{"text": "❌ Cancel", "callback_data": "menu_main"}]]}
            self.edit_message(chat_id, msg_id, text, kb)

        elif data == "action_add_movie":
            self.user_states[chat_id] = {"state": "WAITING_MOVIE_TITLE"}
            text = "🎥 <b>Add New Movie</b>\nPlease type the <b>Title</b> of the movie:"
            kb = {"inline_keyboard": [[{"text": "❌ Cancel", "callback_data": "menu_main"}]]}
            self.edit_message(chat_id, msg_id, text, kb)

    def handle_text(self, chat_id: int, text: str):
        state_info = self.user_states.get(chat_id, {})
        current_state = state_info.get("state")

        if text.startswith("/start") or text.startswith("/menu") or text.startswith("/admin"):
            self.user_states.pop(chat_id, None)
            self.render_main_menu(chat_id)
            return

        if text.startswith("/status"):
            anime_list = self.manager.list_anime()
            movies_list = self.manager.list_movies()
            total_eps = sum(sum(len(s.get("episodes", [])) for s in a.get("seasons", [])) for a in anime_list)
            status_text = (
                "📊 <b>STARK System Status</b>\n\n"
                f"<b>Vercel API URL:</b> <code>{self.manager.api_url}</code>\n"
                f"<b>Neon PostgreSQL DB:</b> {'Connected' if self.manager.db_url else 'Not Set'}\n\n"
                f"🎬 <b>Catalog Stats:</b>\n"
                f"• Anime Series: {len(anime_list)}\n"
                f"• Total Episodes: {total_eps}\n"
                f"• Feature Movies: {len(movies_list)}\n\n"
                "🟢 All systems operational & synced!"
            )
            self.send_message(chat_id, status_text)
            return

        if text.startswith("/list"):
            anime_list = self.manager.list_anime()
            if not anime_list:
                self.send_message(chat_id, "📁 Catalog is currently empty.")
                return

            msg_lines = ["<b>📋 STARK Anime Catalog:</b>\n"]
            for idx, a in enumerate(anime_list[:15], 1):
                ep_count = sum(len(s.get("episodes", [])) for s in a.get("seasons", []))
                msg_lines.append(f"{idx}. <b>{a.get('title')}</b> (ID: <code>{a.get('id')}</code>) - {ep_count} eps")

            self.send_message(chat_id, "\n".join(msg_lines))
            return

        # State Machine handling
        if current_state == "WAITING_ANIME_TITLE":
            self.user_states.pop(chat_id, None)
            res = self.manager.save_anime({
                "title": text.strip(),
                "description": f"Official series page for {text.strip()}",
                "poster_url": "/images/poster_chrono_blade.jpg",
                "rating": 8.5,
                "release_year": 2026
            })
            if res:
                self.send_message(
                    chat_id,
                    f"✅ <b>Anime Created!</b>\nTitle: <b>{text.strip()}</b>\nID: <code>{res.get('id')}</code>",
                    {"inline_keyboard": [[{"text": "📺 View Anime Page", "callback_data": f"anime_{res.get('id')}"}]]}
                )
            else:
                self.send_message(chat_id, "❌ Failed to create anime.")
            return

        if current_state == "WAITING_MOVIE_TITLE":
            self.user_states[chat_id] = {"state": "WAITING_MOVIE_URL", "title": text.strip()}
            self.send_message(chat_id, f"Movie Title set to <b>{text.strip()}</b>.\nNow send the Telegram File ID or Stream URL:")
            return

        if current_state == "WAITING_MOVIE_URL":
            mtitle = state_info.get("title", "Movie")
            self.user_states.pop(chat_id, None)
            res = self.manager.save_movie({
                "title": mtitle,
                "stream_url": text.strip(),
                "poster_url": "/images/poster_chrono_blade.jpg",
                "rating": 8.8,
                "release_year": 2026
            })
            if res:
                self.send_message(
                    chat_id,
                    f"✅ <b>Movie Created!</b>\nTitle: <b>{mtitle}</b>\nID: <code>{res.get('id')}</code>",
                    {"inline_keyboard": [[{"text": "🎥 Manage Movies", "callback_data": "menu_movies"}]]}
                )
            return

        # Fallback welcome message
        self.render_main_menu(chat_id)

    def handle_video_or_document(self, msg: Dict[str, Any]):
        chat_id = msg.get("chat", {}).get("id")
        if not chat_id:
            return

        caption = (msg.get("caption") or "").strip()
        video = msg.get("video")
        document = msg.get("document")
        file_obj = video or document
        file_id = file_obj.get("file_id")
        file_name = file_obj.get("file_name", "video.mp4")

        self.send_message(
            chat_id,
            f"📥 <b>Video Received!</b>\nFile ID: <code>{file_id}</code>\nProcessing upload & catalog sync..."
        )

        anime_id = ""
        season_num = 1
        ep_num = 1
        ep_title = ""

        state_info = self.user_states.get(chat_id, {})
        target_anime_id = state_info.get("target_anime_id", "")

        if caption:
            parts = [p.strip() for p in caption.split("|")]
            for p in parts:
                if ":" in p:
                    k, v = p.split(":", 1)
                    k = k.strip().lower()
                    v = v.strip()
                    if k in ["anime", "anime_id", "id"]:
                        anime_id = v
                    elif k in ["season", "s"]:
                        if v.isdigit():
                            season_num = int(v)
                    elif k in ["ep", "episode", "ep_num"]:
                        if v.isdigit():
                            ep_num = int(v)
                    elif k in ["title", "ep_title"]:
                        ep_title = v

        if not anime_id and target_anime_id:
            anime_id = target_anime_id

        anime_list = self.manager.list_anime()
        if not anime_id and anime_list:
            anime_id = anime_list[0].get("id", "")

        if not anime_id:
            res = self.manager.save_anime({
                "title": "Telegram Uploads Series",
                "description": "Auto-created series for direct Telegram video uploads."
            })
            anime_id = res.get("id") if res else "anime_tg_uploads"

        ep_payload = {
            "episode_number": ep_num,
            "title": ep_title or f"Episode {ep_num} ({file_name})",
            "telegram_file_id": file_id,
            "stream_url": f"tg:{file_id}",
            "stream_urls": {
                "1080p": f"tg:{file_id}",
                "720p": f"tg:{file_id}"
            }
        }

        saved_ep = self.manager.add_episode(anime_id, season_num, ep_payload)

        kb = {
            "inline_keyboard": [
                [{"text": "📺 View Anime Page", "callback_data": f"anime_{anime_id}"}],
                [{"text": "🔙 Admin Main Menu", "callback_data": "menu_main"}]
            ]
        }

        self.send_message(
            chat_id,
            f"✅ <b>Episode Added & Synced Successfully!</b>\n\n"
            f"<b>Anime ID:</b> <code>{anime_id}</code>\n"
            f"<b>Season:</b> {season_num} | <b>Episode:</b> {ep_num}\n"
            f"<b>Title:</b> {ep_payload['title']}\n"
            f"<b>File ID:</b> <code>{file_id}</code>\n\n"
            f"🌐 Live on STARK Anime Mini App!",
            kb
        )

    def start_polling(self):
        if not requests:
            print("[Bot Error] Python 'requests' package not installed.")
            return

        print("⚡ Starting STARK Telegram Admin Bot Polling Server...")
        print(f"Bot Token: {self.token[:12]}...")
        print("Listening for messages, callback buttons, and video uploads from Telegram admins...")

        while True:
            try:
                res = requests.get(
                    f"{self.api_url}/getUpdates",
                    params={"offset": self.offset, "timeout": 20},
                    timeout=35
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("ok"):
                        for update in data.get("result", []):
                            self.offset = update["update_id"] + 1

                            if "callback_query" in update:
                                self.handle_callback(update["callback_query"])

                            elif "message" in update:
                                msg = update["message"]
                                chat_id = msg.get("chat", {}).get("id")

                                if "video" in msg or "document" in msg:
                                    self.handle_video_or_document(msg)
                                elif "text" in msg and chat_id:
                                    self.handle_text(chat_id, msg["text"].strip())

            except Exception as e:
                print(f"[Polling Exception] {e}")
                time.sleep(3)


# ---------------------------------------------------------------------------
# CLI Argument Parser & Entry Point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="STARK ANIME VPS Management & Video Uploader Utility")
    subparsers = parser.add_subparsers(dest="command", help="Available Commands")

    subparsers.add_parser("bot", help="Run active Telegram Bot long-polling server")
    subparsers.add_parser("menu", help="Launch interactive CLI menu console")
    subparsers.add_parser("list", help="List all anime in the catalog")

    add_anime_p = subparsers.add_parser("add-anime", help="Create a new anime series")
    add_anime_p.add_argument("--title", required=True, help="Anime Title")
    add_anime_p.add_argument("--poster", default="", help="Poster Image URL")
    add_anime_p.add_argument("--description", default="", help="Description")

    del_anime_p = subparsers.add_parser("del-anime", help="Delete an anime series")
    del_anime_p.add_argument("--id", required=True, help="Anime ID")

    del_movie_p = subparsers.add_parser("del-movie", help="Delete a movie")
    del_movie_p.add_argument("--id", required=True, help="Movie ID")

    add_ep_p = subparsers.add_parser("add-ep", help="Add an episode to anime season")
    add_ep_p.add_argument("--anime-id", required=True, help="Anime ID")
    add_ep_p.add_argument("--season", type=int, default=1, help="Season number")
    add_ep_p.add_argument("--ep", type=int, required=True, help="Episode number")
    add_ep_p.add_argument("--title", default="", help="Episode title")
    add_ep_p.add_argument("--file-id", default="", help="Telegram File ID or URL")

    up_ep_p = subparsers.add_parser("upload-ep", help="Upload local VPS video file and attach as episode")
    up_ep_p.add_argument("--anime-id", required=True, help="Anime ID")
    up_ep_p.add_argument("--season", type=int, default=1, help="Season number")
    up_ep_p.add_argument("--ep", type=int, required=True, help="Episode number")
    up_ep_p.add_argument("--file", required=True, help="VPS Path to video file")
    up_ep_p.add_argument("--title", default="", help="Episode title")

    args = parser.parse_args()

    manager = StarkManager()
    uploader = TelegramUploader()

    if not args.command or args.command == "bot":
        runner = StarkTelegramBotRunner(TELEGRAM_BOT_TOKEN, manager)
        runner.start_polling()

    elif args.command == "menu":
        run_interactive_menu()

    elif args.command == "list":
        anime_list = manager.list_anime()
        print(f"Total Anime found: {len(anime_list)}")
        for a in anime_list:
            print(f"ID: {a.get('id')} | Title: {a.get('title')} | Seasons: {len(a.get('seasons', []))}")

    elif args.command == "add-anime":
        res = manager.save_anime({
            "title": args.title,
            "poster_url": args.poster or "/images/poster_chrono_blade.jpg",
            "description": args.description or f"Official series {args.title}"
        })
        if res:
            print(f"Anime created successfully with ID: {res.get('id')}")

    elif args.command == "del-anime":
        if manager.delete_anime(args.id):
            print(f"✓ Anime '{args.id}' deleted successfully.")

    elif args.command == "del-movie":
        if manager.delete_movie(args.id):
            print(f"✓ Movie '{args.id}' deleted successfully.")

    elif args.command == "add-ep":
        payload = {
            "episode_number": args.ep,
            "title": args.title or f"Episode {args.ep}",
            "telegram_file_id": args.file_id if not args.file_id.startswith("http") else "",
            "stream_url": args.file_id if args.file_id.startswith("http") else ""
        }
        manager.add_episode(args.anime_id, args.season, payload)

    elif args.command == "upload-ep":
        if not os.path.exists(args.file):
            print(f"File not found: {args.file}")
            sys.exit(1)
        up_res = uploader.upload_via_bot_api(args.file, f"Anime: {args.anime_id} | Ep {args.ep}")
        file_id = up_res.get("file_id", "") if up_res else ""
        payload = {
            "episode_number": args.ep,
            "title": args.title or f"Episode {args.ep}",
            "telegram_file_id": file_id,
            "stream_urls": {
                "1080p": f"tg:{file_id}" if file_id else ""
            }
        }
        manager.add_episode(args.anime_id, args.season, payload)


if __name__ == "__main__":
    main()
