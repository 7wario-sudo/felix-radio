-- Felix Radio - Initial Database Schema
-- Version: 1.0
-- Date: 2024-12-27
-- Description: Initial schema for users, radio stations, schedules, and recordings

-- ============================================================================
-- Table: users
-- Description: User information (synced from Clerk)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,           -- Clerk user ID (e.g., "user_2abc123xyz")
  email TEXT NOT NULL UNIQUE,    -- User email
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Table: radio_stations
-- Description: Radio station information
-- ============================================================================

CREATE TABLE IF NOT EXISTS radio_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Station name (e.g., "TBN 제주")
  stream_url TEXT NOT NULL,              -- HLS stream URL
  is_active BOOLEAN NOT NULL DEFAULT 1,  -- Active status (1: active, 0: inactive)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stations_active ON radio_stations(is_active);

-- ============================================================================
-- Table: schedules
-- Description: Recording schedule configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,                 -- Foreign key to users.id
  station_id INTEGER NOT NULL,           -- Foreign key to radio_stations.id
  program_name TEXT NOT NULL,            -- Schedule/program name (e.g., "아침 뉴스")
  days_of_week TEXT NOT NULL,            -- JSON array (e.g., "[1,2,3,4,5]")
  start_time TEXT NOT NULL,              -- Start time in HH:mm format (e.g., "09:00")
  duration_mins INTEGER NOT NULL,        -- Recording duration in minutes (1-300)
  is_active BOOLEAN NOT NULL DEFAULT 1,  -- Active status (1: active, 0: inactive)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES radio_stations(id) ON DELETE RESTRICT,

  CHECK (duration_mins >= 1 AND duration_mins <= 300)
);

CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_station ON schedules(station_id);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_time ON schedules(start_time);

-- ============================================================================
-- Table: recordings
-- Description: Recording file metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS recordings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,                    -- Foreign key to users.id
  schedule_id INTEGER,                      -- Foreign key to schedules.id (nullable for manual recordings)
  station_id INTEGER NOT NULL,              -- Foreign key to radio_stations.id
  program_name TEXT NOT NULL,               -- Program name (copied from schedule)
  recorded_at DATETIME NOT NULL,            -- Recording start timestamp
  duration_secs INTEGER NOT NULL,           -- Actual recording duration in seconds
  file_size_bytes INTEGER NOT NULL,         -- File size in bytes
  audio_file_path TEXT NOT NULL,            -- R2 file path (e.g., "users/user_id/recordings/file.mp3")
  status TEXT NOT NULL DEFAULT 'pending',   -- Status: pending/recording/completed/failed
  stt_status TEXT NOT NULL DEFAULT 'none',  -- STT status: none/processing/completed/failed
  stt_text_path TEXT,                       -- R2 path for STT text file (nullable)
  error_message TEXT,                       -- Error message if status=failed (nullable)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (station_id) REFERENCES radio_stations(id) ON DELETE RESTRICT,

  CHECK (status IN ('pending', 'recording', 'completed', 'failed')),
  CHECK (stt_status IN ('none', 'processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_recordings_user ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_schedule ON recordings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_recordings_station ON recordings(station_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_stt_status ON recordings(stt_status);
CREATE INDEX IF NOT EXISTS idx_recordings_recorded_at ON recordings(recorded_at DESC);

-- ============================================================================
-- Initial Data: Radio Stations
-- Description: Insert TBN 제주 as the initial station
-- ============================================================================

INSERT INTO radio_stations (name, stream_url, is_active) VALUES
  ('TBN 제주', 'http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8', 1);

-- ============================================================================
-- Migration Complete
-- ============================================================================
