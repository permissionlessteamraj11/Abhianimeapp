export type ContentType = 'anime' | 'movie';

export type ContentClassification = 'G' | 'PG' | 'PG-13' | 'TV-14' | 'TV-MA';

export type ContentStatus = 'Ongoing' | 'Completed' | 'Coming Soon';

export type VideoQuality = '144p' | '240p' | '360p' | '480p' | '720p' | '1080p' | '2K' | '4K' | '8K';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  display_order: number;
  is_enabled: boolean;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

export interface VideoAsset {
  id: string;
  parent_type: 'episode' | 'movie';
  parent_id: string;
  quality: VideoQuality;
  storage_key: string;
  stream_url?: string;
  duration_seconds: number;
  file_size_bytes?: number;
  codec?: string;
  bitrate_kbps?: number;
  width?: number;
  height?: number;
}

export interface SubtitleTrack {
  id: string;
  language_code: string;
  label: string;
  src?: string;
  is_default: boolean;
}

export interface AudioTrack {
  id: string;
  language_code: string;
  label: string;
  is_default: boolean;
}

export interface CommentReply {
  id: string;
  comment_id: string;
  user_id: string;
  username: string;
  user_avatar?: string;
  badge?: string;
  text: string;
  created_at: string;
  likes_count: number;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  content_id: string;
  episode_id?: string;
  user_id: string;
  username: string;
  user_avatar?: string;
  badge?: string;
  text: string;
  created_at: string;
  likes_count: number;
  is_liked?: boolean;
  replies_count: number;
  replies?: CommentReply[];
  is_expanded?: boolean;
}

export interface Episode {
  id: string;
  anime_id: string;
  season_id: string;
  episode_number: number;
  title: string;
  description: string;
  thumbnail_url: string;
  duration_seconds: number;
  stream_url?: string;
  release_date?: string;
  distribution_rights_confirmed: boolean;
  rights_confirmed_by?: string;
  rights_confirmed_at?: string;
  is_published: boolean;
  view_count: number;
  quality?: string;
  codec?: string;
  color_depth?: string;
  audio_language?: string;
  subtitle_language?: string;
  file_size?: string;
  video_assets?: VideoAsset[];
  subtitle_tracks?: SubtitleTrack[];
  audio_tracks?: AudioTrack[];
}

export interface Season {
  id: string;
  anime_id: string;
  season_number: number;
  title: string;
  description?: string;
  is_published: boolean;
  episodes_count?: number;
  episodes?: Episode[];
}

export interface Anime {
  id: string;
  title: string;
  alt_title?: string;
  slug: string;
  description: string;
  poster_url: string;
  backdrop_url: string;
  trailer_url?: string;
  release_year: number;
  rating: number;
  classification: ContentClassification;
  status: ContentStatus;
  language: string;
  available_audio: string[];
  available_subtitles: string[];
  distribution_rights_confirmed: boolean;
  distribution_license_notes?: string;
  rights_confirmed_by?: string;
  rights_confirmed_at?: string;
  is_published: boolean;
  view_count: number;
  genres: string[]; // genre ids or names
  categories: string[]; // category ids
  placements?: string[]; // 'hero' | 'trending' | 'new_episodes' | 'popular_movies' | 'top_rated'
  section_ids?: string[]; // IDs of specific homepage sections
  seasons?: Season[];
  total_seasons?: number;
  total_episodes?: number;
}

export interface Movie {
  id: string;
  title: string;
  alt_title?: string;
  slug: string;
  description: string;
  poster_url: string;
  backdrop_url: string;
  release_year: number;
  runtime_minutes: number;
  rating: number;
  stream_url?: string;
  classification: ContentClassification;
  status: 'Completed' | 'Coming Soon';
  language: string;
  available_audio: string[];
  available_subtitles: string[];
  distribution_rights_confirmed: boolean;
  distribution_license_notes?: string;
  rights_confirmed_by?: string;
  rights_confirmed_at?: string;
  is_published: boolean;
  view_count: number;
  genres: string[];
  categories: string[];
  placements?: string[];
  section_ids?: string[];
  quality?: string;
  codec?: string;
  color_depth?: string;
  audio_language?: string;
  subtitle_language?: string;
  file_size?: string;
  video_assets?: VideoAsset[];
  subtitle_tracks?: SubtitleTrack[];
  audio_tracks?: AudioTrack[];
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  linked_type: 'anime' | 'movie' | 'category';
  linked_id: string;
  button_text: string;
  display_order: number;
  is_enabled: boolean;
  rating?: number;
  year?: number;
  classification?: ContentClassification;
  description?: string;
}

export interface HomepageSection {
  id: string;
  title: string;
  subtitle?: string;
  section_type: 'new_episodes' | 'trending' | 'popular_movies' | 'genre_curated' | 'custom';
  content_source: 'automatic_recent' | 'automatic_views' | 'manual';
  genre_id?: string;
  max_items: number;
  display_order: number;
  is_enabled: boolean;
  items?: (Anime | Movie)[];
}

export interface SavedItem {
  id: string;
  content_type: ContentType;
  content_id: string;
  saved_at: string;
  content?: Anime | Movie;
}

export interface WatchProgress {
  id: string;
  content_type: ContentType;
  content_id: string;
  season_id?: string;
  episode_id?: string;
  position_seconds: number;
  duration_seconds: number;
  completion_percentage: number;
  is_completed: boolean;
  last_watched_at: string;
  content_title?: string;
  content_poster?: string;
  episode_title?: string;
  episode_number?: number;
  season_number?: number;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  join_date?: string;
  is_suspended?: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: 'superadmin' | 'admin' | 'moderator';
}

export interface AdminAuditLog {
  id: string;
  admin_username: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface CopyrightClaim {
  id: string;
  claimant_name: string;
  claimant_email: string;
  organization?: string;
  content_type: ContentType;
  content_id: string;
  alleged_work_description: string;
  infringement_details: string;
  status: 'pending' | 'under_review' | 'content_taken_down' | 'rejected';
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export interface Report {
  id: string;
  user_id?: string;
  content_type: ContentType;
  content_id: string;
  reason: string;
  details?: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface AppSettings {
  appName: string;
  tagline: string;
  theme: string;
  defaultQuality: VideoQuality;
  heroAutoplay: boolean;
  heroDurationMs: number;
  maxHeroBanners: number;
  recommendationsCount: number;
  maintenanceMode: boolean;
  maintenanceNotice?: string;
  announcementActive?: boolean;
  announcementText?: string;
  announcementType?: 'info' | 'warning' | 'alert' | 'gold';
  tokenValidityHours?: number;
  streamWatermarkEnabled?: boolean;
  antiRipProtection?: boolean;
  copyrightEmail: string;
  supportUrl: string;
  antiPiracyEnforced: boolean;
}

export interface SignedPlaybackToken {
  token: string;
  streamUrl: string;
  expiresAt: number;
  quality: VideoQuality;
  availableQualities: VideoQuality[];
}
