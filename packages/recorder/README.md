# Felix Radio Recorder

Node.js recording server for Felix Radio that runs on Vultr VPS.

## Features

- **Scheduled Recording**: Polls Workers API every minute for pending schedules
- **HLS Stream Recording**: Uses ffmpeg to record radio streams to MP3
- **R2 Upload**: Automatically uploads recordings to Cloudflare R2
- **STT Integration**: OpenAI Whisper API for speech-to-text conversion
- **Docker Ready**: Containerized for easy deployment

## Architecture

```
┌─────────────────────────────────────────┐
│  Cron (every 1 minute)                  │
│  ├─ Poll Workers API                    │
│  ├─ Get pending schedules               │
│  └─ Execute recordings in parallel      │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Recording Execution                    │
│  ├─ Create recording metadata (DB)      │
│  ├─ Record HLS stream with ffmpeg       │
│  ├─ Upload MP3 to R2                    │
│  └─ Update status to completed          │
└─────────────────────────────────────────┘
```

## Project Structure

```
packages/recorder/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config.ts             # Configuration loader
│   ├── types.ts              # TypeScript types
│   ├── api/
│   │   └── client.ts         # Workers API client
│   ├── storage/
│   │   └── r2Client.ts       # R2 upload/download
│   ├── recorder/
│   │   └── ffmpeg.ts         # ffmpeg wrapper
│   ├── stt/
│   │   └── whisper.ts        # OpenAI Whisper client
│   ├── scheduler/
│   │   ├── poller.ts         # Schedule poller (cron)
│   │   └── executor.ts       # Recording executor
│   └── lib/
│       └── logger.ts         # Simple logger
├── Dockerfile                # Docker image
├── docker-compose.yml        # Docker Compose config
└── package.json
```

## Prerequisites

- Node.js 20+
- ffmpeg (installed in Docker)
- pnpm
- Docker & Docker Compose (for deployment)

## Development Setup

### 1. Install Dependencies

```bash
cd packages/recorder
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:

```bash
# Cloudflare Workers API
WORKERS_API_URL=http://localhost:8787
INTERNAL_API_KEY=your_api_key

# OpenAI Whisper
OPENAI_API_KEY=sk-proj-...

# R2 Storage
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=felix-radio-recordings
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# Configuration
TZ=Asia/Seoul
LOG_LEVEL=info
```

### 3. Run Development Server

```bash
pnpm dev
```

## Production Deployment (Vultr VPS)

### 1. Provision Vultr VPS

- Region: Seoul, South Korea
- Plan: 1 vCPU / 1GB RAM
- OS: Ubuntu 22.04
- Install Docker and Docker Compose

### 2. Deploy with Docker

```bash
# Clone repository
git clone <repo-url>
cd felix-radio/packages/recorder

# Configure environment
cp .env.example .env
nano .env

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 3. Management Commands

```bash
# View logs
docker-compose logs -f

# Restart service
docker-compose restart

# Stop service
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## Recording Process

### 1. Schedule Polling

Every minute, the poller:
1. Gets current time (Asia/Seoul timezone)
2. Calls `/api/internal/schedules/pending?time=HH:mm&day=0-6`
3. Receives list of schedules to execute

### 2. Recording Execution

For each schedule:
1. Creates recording metadata in D1 (status: `recording`)
2. Runs ffmpeg to record HLS stream
3. Saves MP3 to `/tmp/felix-recordings/{program}_{YYYYMMDD-HHMM}.mp3`
4. Uploads file to R2 at `users/{user_id}/recordings/{filename}`
5. Updates recording status to `completed`
6. Deletes local temp file

### 3. Error Handling

If recording fails:
- Status updated to `failed`
- Error message saved to database
- Local temp file cleaned up
- Next schedule continues normally

## ffmpeg Configuration

Based on legacy script settings:

```bash
ffmpeg -i {stream_url} \
  -t {duration_secs} \
  -codec:a libmp3lame \
  -q:a 4 \
  -ac 2 \
  -ar 44100 \
  {output_file}
```

- **Codec**: MP3 (libmp3lame)
- **Quality**: 4 (VBR, ~165 kbps average)
- **Channels**: 2 (stereo)
- **Sample Rate**: 44.1 kHz

## STT Integration (Future)

Whisper API integration is prepared but not yet connected:

1. Download MP3 from R2
2. Convert to text with Whisper API (Korean language)
3. Upload text file to R2
4. Update recording STT status

## Monitoring

### Logs

Logs are written to stdout with timestamps and levels:

```
[2024-12-28T12:00:00.123Z] [INFO] Starting schedule poller (every 1 minute)
[2024-12-28T12:00:00.456Z] [INFO] Found 2 pending schedule(s)
[2024-12-28T12:00:01.789Z] [INFO] Recording completed { filename: 'news_20241228-1200.mp3', size: 12345678 }
```

### Log Rotation

Docker Compose is configured with JSON file logging:
- Max size: 10MB per file
- Max files: 3 (30MB total)

## Troubleshooting

### ffmpeg not found

Ensure ffmpeg is installed:
```bash
# Ubuntu/Debian
apt install ffmpeg

# Alpine (Docker)
apk add ffmpeg
```

### R2 upload fails

Check R2 credentials and endpoint:
```bash
# Test R2 connection
curl -H "Authorization: Bearer $R2_ACCESS_KEY_ID:$R2_SECRET_ACCESS_KEY" \
  $R2_ENDPOINT/$R2_BUCKET_NAME
```

### Recordings not starting

Check Workers API connectivity:
```bash
curl -H "X-API-Key: $INTERNAL_API_KEY" \
  "$WORKERS_API_URL/api/internal/schedules/pending?time=12:00&day=1"
```

## Phase 3 Completion Status

✅ Task 20.0 - Vultr VPS Provisioning (manual)
✅ Task 21.0 - Recording Server Setup
✅ Task 22.0 - Configuration & Logging
✅ Task 23.0 - Workers API Client
✅ Task 24.0 - ffmpeg Recording Implementation
✅ Task 25.0 - R2 Storage Client
✅ Task 26.0 - Schedule Polling & Execution
✅ Task 27.0 - Whisper STT Integration (prepared)
✅ Task 28.0 - Server Entry Point & Testing

## Next Steps

- **Deploy to Vultr VPS**
- **Test end-to-end recording flow**
- **Connect STT processing**
- **Phase 4: Frontend-Backend Integration**

## License

Proprietary - Felix Radio Project
