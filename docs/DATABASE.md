# 🗄️ Felix Radio - Database Schema

> Database design and schema documentation for Felix Radio service

| Version | Date | Status |
|---------|------|--------|
| 1.0 | 2024-12-27 | Draft |

---

## 1. Overview

Felix Radio는 **Cloudflare D1**을 사용합니다. D1은 SQLite 기반의 서버리스 SQL 데이터베이스로, Cloudflare Workers와 통합되어 엣지에서 낮은 지연시간으로 동작합니다.

**Database Details:**
- Engine: SQLite 3.x (Cloudflare D1)
- Location: Cloudflare Edge Network
- Encoding: UTF-8
- Timezone: UTC

---

## 2. Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
└────────┬────────┘
         │ 1
         │
         │ *
┌────────▼────────┐         ┌──────────────────┐
│   schedules     │ *     1 │  radio_stations  │
└────────┬────────┘◄────────┘                  │
         │ 1                └──────────────────┘
         │
         │ *
┌────────▼────────┐
│   recordings    │
└─────────────────┘

Relationships:
- users (1) ──< (many) schedules
- users (1) ──< (many) recordings
- radio_stations (1) ──< (many) schedules
- schedules (1) ──< (many) recordings
```

---

## 3. Table Schemas

### 3.1 users

사용자 정보 테이블 (Clerk 동기화)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- Clerk user ID (e.g., "user_2abc123xyz")
  email TEXT NOT NULL UNIQUE,    -- User email
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

**Columns:**

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | TEXT | NO | Primary key, Clerk user ID |
| email | TEXT | NO | User email (unique) |
| created_at | DATETIME | NO | Account creation timestamp |
| updated_at | DATETIME | NO | Last update timestamp |

**Sample Data:**
```sql
INSERT INTO users (id, email, created_at, updated_at) VALUES
  ('user_2abc123xyz', 'user@example.com', '2024-12-20 10:00:00', '2024-12-20 10:00:00');
```

**Notes:**
- Clerk에서 신규 사용자 생성 시 자동으로 동기화
- 이메일 변경 시 webhook을 통해 업데이트

---

### 3.2 radio_stations

라디오 방송국 정보 테이블

```sql
CREATE TABLE radio_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Station name (e.g., "TBN 제주")
  stream_url TEXT NOT NULL,              -- HLS stream URL
  is_active BOOLEAN NOT NULL DEFAULT 1,  -- Active status (1: active, 0: inactive)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stations_active ON radio_stations(is_active);
```

**Columns:**

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | INTEGER | NO | Primary key (auto-increment) |
| name | TEXT | NO | Station name |
| stream_url | TEXT | NO | HLS stream URL |
| is_active | BOOLEAN | NO | Active status (1: active, 0: inactive) |
| created_at | DATETIME | NO | Creation timestamp |
| updated_at | DATETIME | NO | Last update timestamp |

**Sample Data:**
```sql
INSERT INTO radio_stations (name, stream_url, is_active) VALUES
  ('TBN 제주', 'http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8', 1),
  ('KBS 제주', 'https://example.com/kbs-jeju/stream.m3u8', 0),
  ('MBC 제주', 'https://example.com/mbc-jeju/stream.m3u8', 0);
```

**Notes:**
- 초기 데이터는 마이그레이션 스크립트로 삽입
- `is_active=0`인 방송국은 사용자에게 노출되지 않음
- Admin API를 통해 방송국 추가/수정 (Phase 2)

---

### 3.3 schedules

녹음 스케줄 테이블

```sql
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,                   -- UUID (e.g., "schedule_abc123")
  user_id TEXT NOT NULL,                 -- Foreign key to users.id
  station_id INTEGER NOT NULL,           -- Foreign key to radio_stations.id
  name TEXT NOT NULL,                    -- Schedule name (e.g., "아침 뉴스")
  days_of_week TEXT NOT NULL,            -- Comma-separated days (e.g., "1,2,3,4,5")
  start_time TEXT NOT NULL,              -- Start time in HH:mm format (e.g., "09:00")
  duration_mins INTEGER NOT NULL,        -- Recording duration in minutes
  is_active BOOLEAN NOT NULL DEFAULT 1,  -- Active status (1: active, 0: inactive)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES radio_stations(id) ON DELETE RESTRICT
);

CREATE INDEX idx_schedules_user ON schedules(user_id);
CREATE INDEX idx_schedules_station ON schedules(station_id);
CREATE INDEX idx_schedules_active ON schedules(is_active);
CREATE INDEX idx_schedules_time ON schedules(start_time);
```

**Columns:**

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | TEXT | NO | Primary key (UUID) |
| user_id | TEXT | NO | Foreign key to users.id |
| station_id | INTEGER | NO | Foreign key to radio_stations.id |
| name | TEXT | NO | Schedule name |
| days_of_week | TEXT | NO | Days of week (0=Sun, 1=Mon, ..., 6=Sat) |
| start_time | TEXT | NO | Start time (HH:mm format, 24-hour) |
| duration_mins | INTEGER | NO | Recording duration (1-300 minutes) |
| is_active | BOOLEAN | NO | Active status (1: active, 0: inactive) |
| created_at | DATETIME | NO | Creation timestamp |
| updated_at | DATETIME | NO | Last update timestamp |

**Sample Data:**
```sql
INSERT INTO schedules (id, user_id, station_id, name, days_of_week, start_time, duration_mins, is_active) VALUES
  ('schedule_abc123', 'user_2abc123xyz', 1, '아침 뉴스', '1,2,3,4,5', '09:00', 60, 1),
  ('schedule_def456', 'user_2abc123xyz', 1, '저녁 교통정보', '1,2,3,4,5', '18:00', 30, 1);
```

**Notes:**
- `days_of_week`: 0=일요일, 1=월요일, ..., 6=토요일 (쉼표로 구분)
- `start_time`: 24시간 형식 (예: "09:00", "18:30")
- `duration_mins`: 1-300 범위 (최대 5시간)
- `user_id` 삭제 시 관련 스케줄 자동 삭제 (CASCADE)
- `station_id` 삭제 시 스케줄 삭제 방지 (RESTRICT)

**Query Examples:**

특정 사용자의 활성 스케줄 조회:
```sql
SELECT s.*, st.name AS station_name, st.stream_url
FROM schedules s
JOIN radio_stations st ON s.station_id = st.id
WHERE s.user_id = 'user_2abc123xyz' AND s.is_active = 1
ORDER BY s.start_time;
```

현재 시각에 실행할 스케줄 조회 (Vultr 서버용):
```sql
-- 예: 2024-12-27 (금요일) 09:00:00
SELECT s.*, st.stream_url
FROM schedules s
JOIN radio_stations st ON s.station_id = st.id
WHERE s.is_active = 1
  AND s.start_time = '09:00'
  AND s.days_of_week LIKE '%5%'  -- 5 = Friday (0-indexed from Sunday)
```

---

### 3.4 recordings

녹음 파일 메타데이터 테이블

```sql
CREATE TABLE recordings (
  id TEXT PRIMARY KEY,                      -- UUID (e.g., "rec_abc123")
  schedule_id TEXT NOT NULL,                -- Foreign key to schedules.id
  user_id TEXT NOT NULL,                    -- Foreign key to users.id
  file_path TEXT NOT NULL,                  -- R2 file path
  file_size INTEGER NOT NULL,               -- File size in bytes
  duration_secs INTEGER NOT NULL,           -- Recording duration in seconds
  status TEXT NOT NULL DEFAULT 'recording', -- Status: recording/completed/failed
  stt_status TEXT NOT NULL DEFAULT 'none',  -- STT status: none/processing/completed/failed
  stt_text_path TEXT,                       -- R2 path for STT text file
  stt_error TEXT,                           -- STT error message (if failed)
  recorded_at DATETIME NOT NULL,            -- Recording start timestamp
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  CHECK (status IN ('recording', 'completed', 'failed')),
  CHECK (stt_status IN ('none', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_recordings_user ON recordings(user_id);
CREATE INDEX idx_recordings_schedule ON recordings(schedule_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_stt_status ON recordings(stt_status);
CREATE INDEX idx_recordings_recorded_at ON recordings(recorded_at DESC);
```

**Columns:**

| Column | Type | Null | Description |
|--------|------|------|-------------|
| id | TEXT | NO | Primary key (UUID) |
| schedule_id | TEXT | NO | Foreign key to schedules.id |
| user_id | TEXT | NO | Foreign key to users.id |
| file_path | TEXT | NO | R2 storage path |
| file_size | INTEGER | NO | File size in bytes |
| duration_secs | INTEGER | NO | Recording duration in seconds |
| status | TEXT | NO | Recording status |
| stt_status | TEXT | NO | STT conversion status |
| stt_text_path | TEXT | YES | R2 path for STT text file |
| stt_error | TEXT | YES | STT error message |
| recorded_at | DATETIME | NO | Recording start timestamp |
| created_at | DATETIME | NO | Creation timestamp |
| updated_at | DATETIME | NO | Last update timestamp |

**Enum Values:**

`status`:
- `recording`: 녹음 진행 중
- `completed`: 녹음 완료
- `failed`: 녹음 실패

`stt_status`:
- `none`: STT 변환 요청 전
- `processing`: STT 변환 진행 중
- `completed`: STT 변환 완료
- `failed`: STT 변환 실패

**Sample Data:**
```sql
INSERT INTO recordings (
  id, schedule_id, user_id, file_path, file_size, duration_secs,
  status, stt_status, stt_text_path, recorded_at
) VALUES (
  'rec_abc123',
  'schedule_abc123',
  'user_2abc123xyz',
  'users/user_2abc123xyz/recordings/2024-12-27_09-00-00.mp3',
  28672000,
  3600,
  'completed',
  'completed',
  'users/user_2abc123xyz/recordings/2024-12-27_09-00-00.txt',
  '2024-12-27 09:00:00'
);
```

**Notes:**
- `file_path` 형식: `users/{user_id}/recordings/{timestamp}.mp3`
- `stt_text_path` 형식: `users/{user_id}/recordings/{timestamp}.txt`
- `schedule_id` 삭제 시 NULL로 설정 (SET NULL)
- `user_id` 삭제 시 녹음 파일도 삭제 (CASCADE)

**Query Examples:**

특정 사용자의 최근 녹음 목록:
```sql
SELECT r.*, s.name AS schedule_name, st.name AS station_name
FROM recordings r
LEFT JOIN schedules s ON r.schedule_id = s.id
LEFT JOIN radio_stations st ON s.station_id = st.id
WHERE r.user_id = 'user_2abc123xyz'
ORDER BY r.recorded_at DESC
LIMIT 20;
```

STT 변환 가능한 녹음 파일 조회:
```sql
SELECT *
FROM recordings
WHERE user_id = 'user_2abc123xyz'
  AND status = 'completed'
  AND stt_status = 'none'
ORDER BY recorded_at DESC;
```

특정 기간 녹음 파일 검색:
```sql
SELECT *
FROM recordings
WHERE user_id = 'user_2abc123xyz'
  AND recorded_at BETWEEN '2024-12-01 00:00:00' AND '2024-12-31 23:59:59'
  AND status = 'completed'
ORDER BY recorded_at DESC;
```

---

## 4. Indexes

### 4.1 Performance Indexes

```sql
-- users
CREATE INDEX idx_users_email ON users(email);

-- radio_stations
CREATE INDEX idx_stations_active ON radio_stations(is_active);

-- schedules
CREATE INDEX idx_schedules_user ON schedules(user_id);
CREATE INDEX idx_schedules_station ON schedules(station_id);
CREATE INDEX idx_schedules_active ON schedules(is_active);
CREATE INDEX idx_schedules_time ON schedules(start_time);

-- recordings
CREATE INDEX idx_recordings_user ON recordings(user_id);
CREATE INDEX idx_recordings_schedule ON recordings(schedule_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_stt_status ON recordings(stt_status);
CREATE INDEX idx_recordings_recorded_at ON recordings(recorded_at DESC);
```

### 4.2 Composite Indexes (Future Optimization)

```sql
-- schedules: Active schedules by time (for poller optimization)
CREATE INDEX idx_schedules_active_time ON schedules(is_active, start_time)
WHERE is_active = 1;

-- recordings: User recordings by date
CREATE INDEX idx_recordings_user_date ON recordings(user_id, recorded_at DESC);

-- recordings: Pending STT conversions
CREATE INDEX idx_recordings_stt_pending ON recordings(status, stt_status)
WHERE status = 'completed' AND stt_status = 'none';
```

---

## 5. Migrations

### 5.1 Migration Strategy

**Migration Files:**
```
apps/api/migrations/
├── 0001_initial_schema.sql
├── 0002_add_stt_error_column.sql
└── 0003_add_composite_indexes.sql
```

**Execution:**
- Cloudflare D1 CLI를 사용하여 마이그레이션 실행
- 버전 관리는 별도 `migrations` 테이블에서 추적

**Migration Tracking Table:**
```sql
CREATE TABLE migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 Initial Migration (0001_initial_schema.sql)

```sql
-- 0001_initial_schema.sql

-- Create users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Create radio_stations table
CREATE TABLE radio_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stations_active ON radio_stations(is_active);

-- Insert initial radio stations
INSERT INTO radio_stations (name, stream_url, is_active) VALUES
  ('TBN 제주', 'http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8', 1);

-- Create schedules table
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  station_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  days_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration_mins INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES radio_stations(id) ON DELETE RESTRICT
);

CREATE INDEX idx_schedules_user ON schedules(user_id);
CREATE INDEX idx_schedules_station ON schedules(station_id);
CREATE INDEX idx_schedules_active ON schedules(is_active);
CREATE INDEX idx_schedules_time ON schedules(start_time);

-- Create recordings table
CREATE TABLE recordings (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  duration_secs INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'recording',
  stt_status TEXT NOT NULL DEFAULT 'none',
  stt_text_path TEXT,
  stt_error TEXT,
  recorded_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  CHECK (status IN ('recording', 'completed', 'failed')),
  CHECK (stt_status IN ('none', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_recordings_user ON recordings(user_id);
CREATE INDEX idx_recordings_schedule ON recordings(schedule_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_stt_status ON recordings(stt_status);
CREATE INDEX idx_recordings_recorded_at ON recordings(recorded_at DESC);

-- Track migration
CREATE TABLE migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO migrations (version, name) VALUES (1, '0001_initial_schema');
```

---

## 6. Data Management

### 6.1 Data Retention Policy

**Recordings:**
- 기본 보관 기간: 90일
- 90일 이후 자동 삭제 (R2 lifecycle policy + D1 cleanup job)
- 사용자가 수동으로 삭제 가능

**Users:**
- 계정 삭제 시 관련 스케줄 및 녹음 파일 자동 삭제 (CASCADE)

**Cleanup Job (Daily):**
```sql
-- Delete recordings older than 90 days
DELETE FROM recordings
WHERE recorded_at < datetime('now', '-90 days');
```

### 6.2 Backup Strategy

**Daily Backup:**
- Cloudflare D1 자동 백업 (일 1회)
- 보관 기간: 30일

**Weekly Export:**
```bash
# Export to R2 (custom script)
wrangler d1 export felix-radio-db --output backup.sql
# Upload to R2
wrangler r2 object put felix-radio-backups/backup-$(date +%Y%m%d).sql --file backup.sql
```

**Recovery:**
```bash
# Restore from backup
wrangler d1 execute felix-radio-db --file backup.sql
```

---

## 7. Database Operations

### 7.1 Connection (Cloudflare Workers)

```typescript
// apps/api/src/db/client.ts
import { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
}

export async function getSchedules(db: D1Database, userId: string) {
  const { results } = await db
    .prepare('SELECT * FROM schedules WHERE user_id = ? AND is_active = 1')
    .bind(userId)
    .all();

  return results;
}
```

### 7.2 Common Queries

**Create Schedule:**
```typescript
async function createSchedule(db: D1Database, data: ScheduleInput) {
  const id = `schedule_${generateId()}`;

  await db
    .prepare(`
      INSERT INTO schedules (id, user_id, station_id, name, days_of_week, start_time, duration_mins, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      data.userId,
      data.stationId,
      data.name,
      data.daysOfWeek.join(','),
      data.startTime,
      data.durationMins,
      data.isActive ? 1 : 0
    )
    .run();

  return id;
}
```

**Fetch Pending Schedules (Poller):**
```typescript
async function fetchPendingSchedules(db: D1Database, currentTime: Date) {
  const dayOfWeek = currentTime.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const timeStr = currentTime.toTimeString().substring(0, 5); // "09:00"

  const { results } = await db
    .prepare(`
      SELECT s.*, st.stream_url
      FROM schedules s
      JOIN radio_stations st ON s.station_id = st.id
      WHERE s.is_active = 1
        AND s.start_time = ?
        AND s.days_of_week LIKE ?
    `)
    .bind(timeStr, `%${dayOfWeek}%`)
    .all();

  return results;
}
```

**Update Recording Status:**
```typescript
async function updateRecordingStatus(
  db: D1Database,
  recordingId: string,
  status: 'completed' | 'failed'
) {
  await db
    .prepare(`
      UPDATE recordings
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(status, recordingId)
    .run();
}
```

---

## 8. Performance Optimization

### 8.1 Query Optimization

**Use Prepared Statements:**
```typescript
// ✅ Good: Reusable prepared statement
const stmt = db.prepare('SELECT * FROM schedules WHERE user_id = ?');
const results1 = await stmt.bind(userId1).all();
const results2 = await stmt.bind(userId2).all();

// ❌ Bad: Multiple query preparations
const results1 = await db.prepare('SELECT * FROM schedules WHERE user_id = ?').bind(userId1).all();
const results2 = await db.prepare('SELECT * FROM schedules WHERE user_id = ?').bind(userId2).all();
```

**Use Pagination:**
```typescript
async function getRecordings(db: D1Database, userId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const { results } = await db
    .prepare(`
      SELECT * FROM recordings
      WHERE user_id = ?
      ORDER BY recorded_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(userId, limit, offset)
    .all();

  return results;
}
```

### 8.2 Caching Strategy

**Cloudflare Workers KV (Future):**
- Cache active schedules (TTL: 5 minutes)
- Cache station list (TTL: 1 hour)
- Invalidate on update

```typescript
// Cache active schedules
const cacheKey = `schedules:${userId}`;
let schedules = await env.KV.get(cacheKey, 'json');

if (!schedules) {
  schedules = await getSchedules(env.DB, userId);
  await env.KV.put(cacheKey, JSON.stringify(schedules), { expirationTtl: 300 });
}

return schedules;
```

---

## 9. Security Considerations

### 9.1 SQL Injection Prevention

**Always use prepared statements:**
```typescript
// ✅ Safe: Prepared statement with binding
await db.prepare('SELECT * FROM recordings WHERE user_id = ?').bind(userId).all();

// ❌ Unsafe: String concatenation
await db.prepare(`SELECT * FROM recordings WHERE user_id = '${userId}'`).all();
```

### 9.2 Data Access Control

**User-based isolation:**
```typescript
// Always include user_id in WHERE clause for user-scoped resources
async function getSchedule(db: D1Database, scheduleId: string, userId: string) {
  const { results } = await db
    .prepare('SELECT * FROM schedules WHERE id = ? AND user_id = ?')
    .bind(scheduleId, userId)
    .all();

  if (results.length === 0) {
    throw new Error('Schedule not found or access denied');
  }

  return results[0];
}
```

---

## 10. Future Enhancements

### 10.1 Full-Text Search (D1 FTS Extension)

```sql
-- Create FTS virtual table for STT text search
CREATE VIRTUAL TABLE recordings_fts USING fts5(
  recording_id,
  text,
  content='recordings'
);

-- Trigger to sync FTS index
CREATE TRIGGER recordings_fts_insert AFTER INSERT ON recordings BEGIN
  INSERT INTO recordings_fts(recording_id, text)
  VALUES (new.id, (SELECT text FROM stt_texts WHERE recording_id = new.id));
END;

-- Search query
SELECT r.*
FROM recordings r
JOIN recordings_fts fts ON r.id = fts.recording_id
WHERE fts.text MATCH '제주 날씨'
ORDER BY fts.rank;
```

### 10.2 Multi-tenancy (Team Support)

```sql
-- Add teams table
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add team_members junction table
CREATE TABLE team_members (
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- owner/admin/member
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add team_id to schedules and recordings
ALTER TABLE schedules ADD COLUMN team_id TEXT REFERENCES teams(id);
ALTER TABLE recordings ADD COLUMN team_id TEXT REFERENCES teams(id);
```

### 10.3 Analytics Table

```sql
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- recording_created/stt_completed/download
  metadata TEXT,            -- JSON data
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_date ON analytics_events(created_at DESC);
```

---

## Appendix

### A. Database Size Estimation

**Per User (Monthly):**
- Schedules: ~5 schedules × 500 bytes = 2.5 KB
- Recordings: ~120 recordings × 1 KB = 120 KB
- Total: ~122.5 KB/user/month

**100 Users (1 Year):**
- Total: 100 users × 122.5 KB × 12 months = ~147 MB

**Cloudflare D1 Limits:**
- Free tier: 5 GB storage (충분함)
- Paid tier: Unlimited storage

### B. Wrangler Commands

```bash
# Create database
wrangler d1 create felix-radio-db

# Execute migration
wrangler d1 execute felix-radio-db --file migrations/0001_initial_schema.sql

# Query database (local)
wrangler d1 execute felix-radio-db --command "SELECT * FROM users LIMIT 5"

# Export database
wrangler d1 export felix-radio-db --output backup.sql

# Import database
wrangler d1 execute felix-radio-db --file backup.sql
```

### C. Helpful SQL Snippets

**Count recordings by status:**
```sql
SELECT status, COUNT(*) AS count
FROM recordings
WHERE user_id = 'user_2abc123xyz'
GROUP BY status;
```

**Find orphaned recordings (deleted schedule):**
```sql
SELECT r.*
FROM recordings r
LEFT JOIN schedules s ON r.schedule_id = s.id
WHERE s.id IS NULL;
```

**Storage usage by user:**
```sql
SELECT user_id, SUM(file_size) AS total_bytes
FROM recordings
WHERE status = 'completed'
GROUP BY user_id
ORDER BY total_bytes DESC;
```
