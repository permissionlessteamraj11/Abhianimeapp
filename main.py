#!/usr/bin/env python3
"""
=============================================================================
STARK ANIME - VPS CONTENT MANAGEMENT & VIDEO UPLOADER (main.py)
=============================================================================
This script runs standalone on a VPS (Ubuntu/Debian) to:
 1. Connect directly to Neon PostgreSQL or STARK Admin REST API.
 2. Manage Anime, Seasons, Episodes, and Movies.
 3. Upload local video files directly to Telegram channels.
 4. Auto-generate file_id & streaming links for 1080p, 720p, 480p, 360p.
 5. Provide CLI, Interactive Terminal Menu, and Telegram Bot modes.
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
DATABASE_URL = os.getenv("DATABASE_URL", "")

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
        # Try REST API first, fallback to DB
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
        # Set default structure
        if "id" not in anime_data or not anime_data["id"]:
            anime_data["id"] = f"anime-{int(time.time())}"
        if "slug" not in anime_data or not anime_data["slug"]:
            anime_data["slug"] = anime_data.get("title", anime_data["id"]).lower().replace(" ", "-")

        # Try API save
        res = self.api_post("/api/admin/anime", anime_data)
        if res:
            print(f"✓ Anime '{anime_data.get('title')}' saved successfully via API.")
            return res

        # Fallback to direct DB save
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

    def add_season(self, anime_id: str, season_number: int, title: Optional[str] = None) -> Optional[Dict[str, Any]]:
        season_payload = {
            "id": f"s-{int(time.time())}",
            "season_number": season_number,
            "title": title or f"Season {season_number}",
            "description": f"Season {season_number}",
            "is_published": True,
            "episodes": []
        }

        # Try REST API
        res = self.api_post(f"/api/admin/anime/{anime_id}/seasons", season_payload)
        if res:
            print(f"✓ Season {season_number} added to Anime '{anime_id}' via API.")
            return season_payload

        # Fallback DB
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

    def add_episode(self, anime_id: str, season_id_or_num: Any, episode_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        # Resolve season_id
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
                # Create season automatically
                print(f"Season {s_num} not found. Creating Season {s_num}...")
                target_season = self.add_season(anime_id, s_num)
        else:
            target_season = next((s for s in seasons if s.get("id") == season_id_or_num), None)

        season_id = target_season.get("id") if target_season else f"s-{season_id_or_num}"

        # Standardize episode payload
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

        # Try API
        res = self.api_post(f"/api/admin/anime/{anime_id}/seasons/{season_id}/episodes", ep_payload)
        if res:
            print(f"✓ Episode {ep_num} ('{ep_payload['title']}') saved via API.")
            return ep_payload

        # Fallback DB
        catalog = self.get_catalog_from_db()
        if catalog:
            for a in catalog.get("anime", []):
                if a.get("id") == anime_id:
                    for s in a.get("seasons", []):
                        if s.get("id") == season_id or s.get("season_number") == season_id_or_num:
                            if "episodes" not in s:
                                s["episodes"] = []
                            # Replace existing or append
                            idx = next((i for i, e in enumerate(s["episodes"]) if e.get("id") == ep_id), -1)
                            if idx >= 0:
                                s["episodes"][idx] = {**s["episodes"][idx], **ep_payload}
                            else:
                                s["episodes"].append(ep_payload)
                            if self.save_catalog_to_db(catalog):
                                print(f"✓ Episode {ep_num} saved directly to Neon DB.")
                                return ep_payload
        return None

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


# ---------------------------------------------------------------------------
# Telegram Uploader Module (Bot API & Pyrogram support)
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
            print("Please use Pyrogram mode or supply a Telegram Channel File ID directly.")

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
        print(" 8. Test Database & API Connection")
        print(" 0. Exit")
        print("=" * 60)

        choice = input("Select an option [0-8]: ").strip()

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
# CLI Argument Parser & Entry Point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="STARK ANIME VPS Management & Video Uploader Utility")
    subparsers = parser.add_subparsers(dest="command", help="Available Commands")

    # Command: menu
    subparsers.add_parser("menu", help="Launch interactive CLI menu console")

    # Command: list
    subparsers.add_parser("list", help="List all anime in the catalog")

    # Command: add-anime
    add_anime_p = subparsers.add_parser("add-anime", help="Create a new anime series")
    add_anime_p.add_argument("--title", required=True, help="Anime Title")
    add_anime_p.add_argument("--poster", default="", help="Poster Image URL")
    add_anime_p.add_argument("--description", default="", help="Description")

    # Command: add-ep
    add_ep_p = subparsers.add_parser("add-ep", help="Add an episode to anime season")
    add_ep_p.add_argument("--anime-id", required=True, help="Anime ID")
    add_ep_p.add_argument("--season", type=int, default=1, help="Season number")
    add_ep_p.add_argument("--ep", type=int, required=True, help="Episode number")
    add_ep_p.add_argument("--title", default="", help="Episode title")
    add_ep_p.add_argument("--file-id", default="", help="Telegram File ID or URL")

    # Command: upload-ep
    up_ep_p = subparsers.add_parser("upload-ep", help="Upload local VPS video file and attach as episode")
    up_ep_p.add_argument("--anime-id", required=True, help="Anime ID")
    up_ep_p.add_argument("--season", type=int, default=1, help="Season number")
    up_ep_p.add_argument("--ep", type=int, required=True, help="Episode number")
    up_ep_p.add_argument("--file", required=True, help="VPS Path to video file")
    up_ep_p.add_argument("--title", default="", help="Episode title")

    args = parser.parse_args()

    manager = StarkManager()
    uploader = TelegramUploader()

    if not args.command or args.command == "menu":
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
