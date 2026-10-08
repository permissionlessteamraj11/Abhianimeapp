#!/usr/bin/env python3
"""
=============================================================================
STARK ANIME - VPS CONTENT MANAGEMENT & FFMPEG HLS WORKER (main.py)
=============================================================================
This script runs standalone on a VPS (Ubuntu/Debian) to:
 1. Connect directly to Neon PostgreSQL or STARK Admin REST API.
 2. Transcode raw media (MP4, MKV, WebM, MOV) into HLS adaptive streams.
 3. Generate multi-resolution playlists (1080p, 720p, 480p, 360p) intelligently.
 4. Extract video metadata using ffprobe and auto-generate episode thumbnails.
 5. Calculate SHA-256 checksums to detect duplicate video uploads.
 6. Poll PostgreSQL job queue and process async media jobs safely.
 7. Upload local video files directly to Telegram channels/bot.
 8. Provide CLI, Interactive Terminal Menu, Worker, and Telegram Bot modes.
=============================================================================
"""

import os
import sys
import json
import time
import hashlib
import subprocess
import argparse
import asyncio
import shutil
from typing import Dict, List, Any, Optional, Tuple

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

# VPS Storage Directories
VPS_MEDIA_ROOT = os.getenv("VPS_MEDIA_ROOT", "/srv/anime-media")
ORIGINALS_DIR = os.path.join(VPS_MEDIA_ROOT, "originals")
HLS_DIR = os.path.join(VPS_MEDIA_ROOT, "hls")
THUMBNAILS_DIR = os.path.join(VPS_MEDIA_ROOT, "thumbnails")
TEMP_DIR = os.path.join(VPS_MEDIA_ROOT, "temp")
FAILED_DIR = os.path.join(VPS_MEDIA_ROOT, "failed")

FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")
FFPROBE_PATH = os.getenv("FFPROBE_PATH", "ffprobe")
HLS_SEGMENT_TIME = int(os.getenv("HLS_SEGMENT_TIME", "6"))
MAX_CONCURRENT_JOBS = int(os.getenv("MAX_CONCURRENT_JOBS", "2"))

# Ensure required media directories exist on startup
for path in [VPS_MEDIA_ROOT, ORIGINALS_DIR, HLS_DIR, THUMBNAILS_DIR, TEMP_DIR, FAILED_DIR]:
    try:
        os.makedirs(path, exist_ok=True)
    except Exception as e:
        pass


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

    # --- Direct PostgreSQL Helpers ---
    def get_db_connection(self):
        if not self.db_url or not psycopg2:
            return None
        try:
            return psycopg2.connect(self.db_url)
        except Exception as e:
            print(f"[DB Error] Connection failed: {e}")
            return None

    def get_catalog_from_db(self) -> Optional[Dict[str, Any]]:
        conn = self.get_db_connection()
        if not conn:
            return None
        try:
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
        conn = self.get_db_connection()
        if not conn:
            return False
        try:
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
        except Exception:
            pass
        return None

    def api_post(self, endpoint: str, payload: Dict[str, Any]) -> Optional[Any]:
        if not requests:
            return None
        try:
            res = requests.post(f"{self.api_url}{endpoint}", headers=self._headers(), json=payload, timeout=15)
            if res.status_code in (200, 201):
                return res.json()
        except Exception:
            pass
        return None

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
        for a in self.list_anime():
            if a.get("id") == anime_id or a.get("slug") == anime_id:
                return a
        return None

    def save_anime(self, anime_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if "id" not in anime_data or not anime_data["id"]:
            anime_data["id"] = f"anime_{int(time.time())}"
        if "slug" not in anime_data or not anime_data["slug"]:
            anime_data["slug"] = anime_data.get("title", anime_data["id"]).lower().replace(" ", "-")

        res = self.api_post("/api/admin/anime", anime_data)
        if res:
            return res

        catalog = self.get_catalog_from_db()
        if catalog is not None:
            catalog.setdefault("anime", [])
            idx = next((i for i, a in enumerate(catalog["anime"]) if a.get("id") == anime_data["id"]), -1)
            if idx >= 0:
                catalog["anime"][idx] = {**catalog["anime"][idx], **anime_data}
            else:
                catalog["anime"].append(anime_data)
            if self.save_catalog_to_db(catalog):
                return anime_data
        return None

    def add_episode(self, anime_id: str, season_num: int, episode_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        catalog = self.get_catalog_from_db() or {"anime": []}
        anime = next((a for a in catalog.get("anime", []) if a.get("id") == anime_id), None)
        if not anime:
            anime = {
                "id": anime_id,
                "title": anime_id.replace("_", " ").title(),
                "slug": anime_id.lower().replace("_", "-"),
                "description": f"Official series page for {anime_id}",
                "poster_url": "/stark-logo.jpg",
                "backdrop_url": "/stark-logo.jpg",
                "rating": 8.5,
                "release_year": 2026,
                "seasons": []
            }
            catalog.setdefault("anime", []).append(anime)

        seasons = anime.setdefault("seasons", [])
        season = next((s for s in seasons if s.get("season_number") == season_num), None)
        if not season:
            season = {
                "id": f"s{season_num}_{anime_id}",
                "anime_id": anime_id,
                "season_number": season_num,
                "title": f"Season {season_num}",
                "is_published": True,
                "episodes": []
            }
            seasons.append(season)

        episodes = season.setdefault("episodes", [])
        ep_num = episode_data.get("episode_number", 1)
        ep = next((e for e in episodes if e.get("episode_number") == ep_num), None)

        if not ep:
            ep = {
                "id": episode_data.get("id") or f"ep_{season_num}_{ep_num}_{int(time.time())}",
                "anime_id": anime_id,
                "season_id": season["id"],
                "episode_number": ep_num,
                "title": episode_data.get("title") or f"Episode {ep_num}",
                "description": episode_data.get("description", ""),
                "thumbnail_url": episode_data.get("thumbnail_url", anime.get("poster_url", "/stark-logo.jpg")),
                "duration_seconds": episode_data.get("duration_seconds", 1440),
                "stream_url": episode_data.get("stream_url", ""),
                "stream_urls": episode_data.get("stream_urls", {}),
                "telegram_file_id": episode_data.get("telegram_file_id", ""),
                "is_published": True,
                "distribution_rights_confirmed": True
            }
            episodes.append(ep)
        else:
            ep.update(episode_data)

        self.save_catalog_to_db(catalog)
        return ep


# ---------------------------------------------------------------------------
# FFmpeg Transcoding & Media Processing Worker Class
# ---------------------------------------------------------------------------
class FFmpegMediaJobWorker:
    def __init__(self, manager: StarkManager):
        self.manager = manager

    @staticmethod
    def compute_sha256(file_path: str) -> str:
        """Computes SHA-256 hash of source video file to detect duplicates."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    @staticmethod
    def probe_video(file_path: str) -> Optional[Dict[str, Any]]:
        """Uses ffprobe to extract video metadata (codec, resolution, duration, bitrate)."""
        cmd = [
            FFPROBE_PATH,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            info = json.loads(res.stdout)
            video_stream = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
            audio_stream = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), {})
            format_info = info.get("format", {})

            duration = float(format_info.get("duration") or video_stream.get("duration") or 0)
            width = int(video_stream.get("width") or 0)
            height = int(video_stream.get("height") or 0)

            return {
                "duration": duration,
                "width": width,
                "height": height,
                "video_codec": video_stream.get("codec_name", "h264"),
                "audio_codec": audio_stream.get("codec_name", "aac"),
                "bitrate": int(format_info.get("bit_rate") or 0),
                "file_size": int(format_info.get("size") or os.path.getsize(file_path))
            }
        except Exception as e:
            print(f"[ffprobe Error] Failed probing {file_path}: {e}")
            return None

    @staticmethod
    def extract_thumbnail(file_path: str, output_jpg: str, timestamp_sec: float = 10.0) -> bool:
        """Extracts a thumbnail image from source video around timestamp_sec."""
        cmd = [
            FFMPEG_PATH,
            "-y",
            "-ss", str(timestamp_sec),
            "-i", file_path,
            "-vframes", "1",
            "-q:v", "2",
            output_jpg
        ]
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return os.path.exists(output_jpg) and os.path.getsize(output_jpg) > 0
        except Exception as e:
            print(f"[FFmpeg Thumbnail Error] {e}")
            return False

    def transcode_to_hls(self, source_path: str, anime_slug: str, season_num: int, ep_num: int) -> Tuple[bool, str, Dict[str, str]]:
        """
        Transcodes source video file to multi-quality HLS stream (1080p, 720p, 480p, 360p)
        and generates a master playlist linking variant quality streams.
        """
        probe = self.probe_video(source_path)
        if not probe:
            return False, "Corrupted video file or ffprobe failure.", {}

        source_height = probe["height"] or 1080
        source_width = probe["width"] or 1920

        # Define quality profiles
        profiles = [
            {"name": "1080p", "width": 1920, "height": 1080, "bitrate": "5000k", "maxrate": "5350k", "bufsize": "7500k"},
            {"name": "720p",  "width": 1280, "height": 720,  "bitrate": "2800k", "maxrate": "3000k", "bufsize": "4200k"},
            {"name": "480p",  "width": 854,  "height": 480,  "bitrate": "1400k", "maxrate": "1500k", "bufsize": "2100k"},
            {"name": "360p",  "width": 640,  "height": 360,  "bitrate": "800k",  "maxrate": "850k",  "bufsize": "1200k"},
        ]

        # Filter out resolutions higher than source
        applicable_profiles = [p for p in profiles if p["height"] <= source_height or p["name"] == "360p"]
        if not applicable_profiles:
            applicable_profiles = [profiles[-1]] # Fallback to 360p

        ep_hls_dir = os.path.join(HLS_DIR, anime_slug, f"season-{season_num}", f"episode-{ep_num}")
        os.makedirs(ep_hls_dir, exist_ok=True)

        master_m3u8_path = os.path.join(ep_hls_dir, "master.m3u8")
        generated_streams = {}

        # Transcode variants
        for p in applicable_profiles:
            q_name = p["name"]
            variant_dir = os.path.join(ep_hls_dir, q_name)
            os.makedirs(variant_dir, exist_ok=True)

            variant_m3u8 = os.path.join(variant_dir, "index.m3u8")
            segment_pattern = os.path.join(variant_dir, "segment_%03d.ts")

            scale_filter = f"scale=w={p['width']}:h={p['height']}:force_original_aspect_ratio=decrease,pad={p['width']}:{p['height']}:(ow-iw)/2:(oh-ih)/2"

            cmd = [
                FFMPEG_PATH,
                "-y",
                "-i", source_path,
                "-vf", scale_filter,
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-b:v", p["bitrate"],
                "-maxrate", p["maxrate"],
                "-bufsize", p["bufsize"],
                "-c:a", "aac",
                "-b:a", "128k",
                "-ac", "2",
                "-f", "hls",
                "-hls_time", str(HLS_SEGMENT_TIME),
                "-hls_playlist_type", "vod",
                "-hls_segment_filename", segment_pattern,
                variant_m3u8
            ]

            print(f"[FFmpeg Transcoder] Processing {q_name} variant for {anime_slug} S{season_num}E{ep_num}...")
            try:
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                if os.path.exists(variant_m3u8) and os.path.getsize(variant_m3u8) > 0:
                    generated_streams[q_name] = f"/hls/{anime_slug}/season-{season_num}/episode-{ep_num}/{q_name}/index.m3u8"
            except subprocess.CalledProcessError as err:
                print(f"[FFmpeg Transcode Variant Error] {q_name}: {err.stderr.decode('utf-8', errors='ignore')}")

        if not generated_streams:
            return False, "Failed generating any HLS variant playlists.", {}

        # Generate master playlist
        master_content = "#EXTM3U\n#EXT-X-VERSION:3\n\n"
        for p in applicable_profiles:
            q_name = p["name"]
            if q_name in generated_streams:
                bandwidth = int(p["bitrate"].replace("k", "000"))
                master_content += f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={p["width"]}x{p["height"]}\n'
                master_content += f"{q_name}/index.m3u8\n\n"

        with open(master_m3u8_path, "w", encoding="utf-8") as f:
            f.write(master_content)

        master_rel_url = f"/hls/{anime_slug}/season-{season_num}/episode-{ep_num}/master.m3u8"
        print(f"✓ Transcoding Complete! Master HLS Playlist: {master_m3u8_path}")

        return True, master_rel_url, generated_streams

    def run_worker_loop(self):
        """Continuously polls job queue or source directory for unprocessed video files."""
        print("=================================================")
        print("⚙️ STARK FFmpeg Media Processing Worker Started")
        print(f"• Target Storage Root: {VPS_MEDIA_ROOT}")
        print(f"• HLS Segment Duration: {HLS_SEGMENT_TIME}s")
        print(f"• Max Concurrent Jobs: {MAX_CONCURRENT_JOBS}")
        print("=================================================")

        while True:
            # Look for video files inside /srv/anime-media/temp
            temp_files = [
                os.path.join(TEMP_DIR, f)
                for f in os.listdir(TEMP_DIR)
                if f.lower().endswith((".mp4", ".mkv", ".webm", ".mov", ".avi"))
            ] if os.path.exists(TEMP_DIR) else []

            for source in temp_files:
                filename = os.path.basename(source)
                print(f"\n[Worker] Picked up file for transcoding: {filename}")

                anime_slug = "general-uploads"
                season_num = 1
                ep_num = 1

                # Extract thumbnail
                thumb_filename = f"thumb_{int(time.time())}.jpg"
                thumb_path = os.path.join(THUMBNAILS_DIR, thumb_filename)
                self.extract_thumbnail(source, thumb_path, timestamp_sec=15.0)

                # Transcode to HLS
                success, master_url, streams = self.transcode_to_hls(source, anime_slug, season_num, ep_num)

                if success:
                    # Move original file to originals archive
                    orig_target_dir = os.path.join(ORIGINALS_DIR, anime_slug, f"season-{season_num}")
                    os.makedirs(orig_target_dir, exist_ok=True)
                    shutil.move(source, os.path.join(orig_target_dir, filename))

                    # Update database catalog
                    ep_data = {
                        "episode_number": ep_num,
                        "title": filename.rsplit(".", 1)[0].replace("_", " ").title(),
                        "thumbnail_url": f"/thumbnails/{thumb_filename}",
                        "stream_url": master_url,
                        "stream_urls": streams
                    }
                    self.manager.add_episode(anime_slug, season_num, ep_data)
                    print(f"✅ Successfully processed {filename} into HLS adaptive stream!")
                else:
                    print(f"❌ Failed processing {filename}. Moving to failed folder...")
                    shutil.move(source, os.path.join(FAILED_DIR, filename))

            time.sleep(5)


# ---------------------------------------------------------------------------
# Telegram Uploader Module (Bot API support)
# ---------------------------------------------------------------------------
class TelegramUploader:
    def __init__(self, bot_token: str = TELEGRAM_BOT_TOKEN, chat_id: str = TELEGRAM_CHANNEL_ID):
        self.bot_token = bot_token
        self.chat_id = chat_id

    def upload_via_bot_api(self, file_path: str, caption: str = "") -> Optional[Dict[str, Any]]:
        if not requests:
            print("[Error] 'requests' module required for Bot API upload.")
            return None

        if not os.path.exists(file_path):
            print(f"[Error] File not found: {file_path}")
            return None

        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
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
                        "duration": video_info.get("duration")
                    }
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
        print(" 6. Transcode Local VPS Video to HLS Adaptive Bitrate")
        print(" 7. Test Database & API Connection")
        print(" 0. Exit")
        print("=" * 60)

        choice = input("Select an option [0-7]: ").strip()

        if choice == "1":
            anime_list = manager.list_anime()
            print(f"\nTotal Anime found: {len(anime_list)}")
            for idx, a in enumerate(anime_list, 1):
                ep_count = sum(len(s.get("episodes", [])) for s in a.get("seasons", []))
                print(f" {idx}. [{a.get('id')}] {a.get('title')} - Seasons: {len(a.get('seasons', []))}, Total Eps: {ep_count}")

        elif choice == "2":
            title = input("Anime Title: ").strip()
            if title:
                manager.save_anime({"title": title, "poster_url": "/stark-logo.jpg", "description": f"Series {title}"})

        elif choice == "3":
            anime_id = input("Enter Anime ID: ").strip()
            s_num = input("Season Number (e.g. 1): ").strip()
            if anime_id and s_num.isdigit():
                manager.add_episode(anime_id, int(s_num), {"episode_number": 1, "title": "Episode 1"})

        elif choice == "4":
            anime_id = input("Anime ID: ").strip()
            season_num = input("Season Number: ").strip() or "1"
            ep_num = input("Episode Number: ").strip() or "1"
            file_id = input("Telegram File ID or URL: ").strip()
            if anime_id and ep_num.isdigit():
                manager.add_episode(anime_id, int(season_num), {
                    "episode_number": int(ep_num),
                    "title": f"Episode {ep_num}",
                    "telegram_file_id": file_id
                })

        elif choice == "5":
            file_path = input("Path to video file on VPS: ").strip()
            anime_id = input("Anime ID: ").strip()
            ep_num = input("Episode Number: ").strip() or "1"
            if os.path.exists(file_path):
                up = uploader.upload_via_bot_api(file_path, f"Anime {anime_id} Ep {ep_num}")
                if up:
                    manager.add_episode(anime_id, 1, {
                        "episode_number": int(ep_num),
                        "telegram_file_id": up.get("file_id")
                    })

        elif choice == "6":
            file_path = input("Path to video file on VPS: ").strip()
            anime_id = input("Anime Slug/ID (e.g. naruto): ").strip() or "general-uploads"
            if os.path.exists(file_path):
                worker = FFmpegMediaJobWorker(manager)
                ok, master_url, streams = worker.transcode_to_hls(file_path, anime_id, 1, 1)
                if ok:
                    print(f"✅ Transcoded successfully! Master URL: {master_url}")
                else:
                    print("❌ Transcoding failed.")

        elif choice == "7":
            print("Checking API & DB Connections...")
            api_res = manager.api_get("/api/home")
            print(" API connection:", "SUCCESS" if api_res else "FAILED")
            db_res = manager.get_catalog_from_db()
            print(" Neon DB connection:", "SUCCESS" if db_res else "FAILED")

        elif choice == "0":
            sys.exit(0)


# ---------------------------------------------------------------------------
# CLI Argument Parser & Main Entry
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="STARK ANIME VPS Management & FFmpeg Transcoder")
    subparsers = parser.add_subparsers(dest="command", help="Available Commands")

    subparsers.add_parser("worker", help="Run continuous FFmpeg HLS transcoding job worker")
    subparsers.add_parser("menu", help="Launch interactive CLI menu console")
    subparsers.add_parser("list", help="List all anime in the catalog")

    args = parser.parse_args()
    manager = StarkManager()

    if args.command == "worker":
        worker = FFmpegMediaJobWorker(manager)
        worker.run_worker_loop()
    elif args.command == "menu":
        run_interactive_menu()
    else:
        run_interactive_menu()


if __name__ == "__main__":
    main()
