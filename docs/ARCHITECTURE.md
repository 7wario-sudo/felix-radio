# 🏗️ Felix Radio - System Architecture

> Technical architecture design for Felix Radio service

| Version | Date | Status |
|---------|------|--------|
| 1.0 | 2024-12-27 | Draft |

---

## 1. System Overview

Felix Radio는 마이크로서비스 아키텍처를 기반으로 한 분산 시스템입니다. Cloudflare의 엣지 인프라와 Vultr VPS를 조합하여 안정적인 라디오 녹음 및 STT 변환 서비스를 제공합니다.

### 1.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Internet Users                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Clerk Auth    │
                    │  (Third-party)  │
                    └────────┬────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                   Cloudflare Global Network                     │
│                                                                  │
│  ┌──────────────┐        ┌──────────────┐      ┌─────────────┐ │
│  │   Pages      │        │   Workers    │      │     R2      │ │
│  │  (Next.js)   │◄──────►│    (Hono)    │◄────►│  (Storage)  │ │
│  │              │        │              │      │             │ │
│  └──────────────┘        └──────┬───────┘      └─────────────┘ │
│                                 │                               │
│                          ┌──────▼───────┐                       │
│                          │      D1      │                       │
│                          │  (Database)  │                       │
│                          └──────────────┘                       │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │ API Key Auth
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Vultr VPS (Seoul)                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Recording Server (Node.js)                              │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │  │
│  │  │  Scheduler  │  │   Recorder   │  │  STT Processor  │ │  │
│  │  │ (node-cron) │─►│   (ffmpeg)   │  │   (Whisper)     │ │  │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP Streaming
                             │
                    ┌────────▼────────┐
                    │  Radio Stations │
                    │  (HLS Streams)  │
                    └─────────────────┘
```

---

## 2. Component Architecture

### 2.1 Frontend Layer (Next.js on Cloudflare Pages)

**Technology Stack:**
- Framework: Next.js 14+ (App Router)
- Styling: Tailwind CSS
- State Management: React Context / Zustand
- HTTP Client: fetch / SWR
- Deployment: Cloudflare Pages

**Directory Structure:**
```
apps/web/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── page.tsx              # Dashboard
│   │   ├── schedules/
│   │   │   └── page.tsx          # Schedule management
│   │   └── recordings/
│   │       ├── page.tsx          # Recording list
│   │       └── [id]/page.tsx     # Recording detail
│   └── layout.tsx
├── components/
│   ├── ui/                        # Shadcn UI components
│   ├── schedules/
│   ├── recordings/
│   └── shared/
├── lib/
│   ├── api.ts                     # API client
│   ├── auth.ts                    # Clerk integration
│   └── utils.ts
└── public/
    └── felix-logo.svg
```

**Key Responsibilities:**
- User authentication UI (Clerk integration)
- Schedule CRUD interface
- Recording list and playback
- STT text viewer
- Real-time status updates

---

### 2.2 API Layer (Cloudflare Workers + Hono)

**Technology Stack:**
- Runtime: Cloudflare Workers
- Framework: Hono
- Database: Cloudflare D1 (SQLite)
- Storage: Cloudflare R2
- Auth: Clerk JWT validation

**Directory Structure:**
```
apps/api/
├── src/
│   ├── index.ts                   # Worker entry point
│   ├── routes/
│   │   ├── schedules.ts
│   │   ├── recordings.ts
│   │   ├── stations.ts
│   │   └── internal.ts            # Internal API for Vultr
│   ├── middleware/
│   │   ├── auth.ts                # Clerk JWT validation
│   │   └── apiKey.ts              # Internal API key auth
│   ├── db/
│   │   ├── schema.sql
│   │   └── queries.ts
│   └── lib/
│       ├── r2.ts                  # R2 operations
│       └── utils.ts
├── wrangler.toml
└── package.json
```

**Key Responsibilities:**
- RESTful API endpoints
- Authentication & authorization
- Database operations (D1)
- R2 file management (signed URLs)
- Recording metadata management

---

### 2.3 Recording Server (Vultr VPS)

**Technology Stack:**
- Runtime: Node.js 20+
- Scheduler: node-cron
- Recorder: ffmpeg
- STT: OpenAI Whisper API
- OS: Ubuntu 22.04 LTS

**Directory Structure:**
```
packages/recorder/
├── src/
│   ├── index.ts                   # Server entry point
│   ├── scheduler/
│   │   ├── poller.ts              # Poll D1 for schedules
│   │   └── executor.ts            # Execute scheduled recordings
│   ├── recorder/
│   │   ├── ffmpeg.ts              # ffmpeg wrapper
│   │   └── stream.ts              # HLS stream handler
│   ├── stt/
│   │   ├── whisper.ts             # Whisper API client
│   │   └── processor.ts           # Audio processing
│   ├── storage/
│   │   └── r2Client.ts            # R2 upload/download
│   └── api/
│       └── client.ts              # Workers API client
├── config/
│   └── stations.json              # Radio station configs
├── Dockerfile
└── package.json
```

**Key Responsibilities:**
- Poll Workers API for pending schedules (1-minute interval)
- Execute ffmpeg recordings at scheduled times
- Upload MP3 files to R2
- Process STT requests via Whisper API
- Update recording status in D1

**Recording Flow:**
```
┌──────────────┐     1. Poll every 1min
│   Scheduler  │────────────────────────►┌──────────────┐
│   (poller)   │◄────────────────────────│  Workers API │
└──────┬───────┘  2. Pending schedules   └──────────────┘
       │
       │ 3. Time match?
       ▼
┌──────────────┐     4. Start ffmpeg
│   Executor   │────────────────────────►┌──────────────┐
└──────┬───────┘                         │    ffmpeg    │
       │                                 └──────┬───────┘
       │                                        │
       │ 6. Upload MP3                  5. Save MP3
       ▼                                        │
┌──────────────┐◄────────────────────────────────┘
│      R2      │
└──────┬───────┘
       │ 7. Update metadata
       ▼
┌──────────────┐
│  Workers API │
└──────────────┘
```

---

## 3. Data Flow

### 3.1 Recording Workflow

```
User Action (Web)
       │
       │ 1. Create schedule
       ▼
┌────────────────┐
│  Workers API   │
│  POST /api/    │
│   schedules    │
└───────┬────────┘
        │ 2. Insert to D1
        ▼
┌────────────────┐
│   D1 Database  │
└────────────────┘
        │
        │ 3. Poll (every 1min)
        ▼
┌────────────────┐
│ Vultr Recorder │
│   GET /api/    │
│internal/schedules
└───────┬────────┘
        │ 4. Time match → Execute
        ▼
┌────────────────┐
│     ffmpeg     │
│  HLS → MP3     │
└───────┬────────┘
        │ 5. Upload
        ▼
┌────────────────┐
│    R2 Storage  │
└────────────────┘
        │
        │ 6. POST metadata
        ▼
┌────────────────┐
│  Workers API   │
│  POST /api/    │
│ internal/      │
│  recordings    │
└───────┬────────┘
        │ 7. Update D1
        ▼
┌────────────────┐
│   D1 Database  │
└───────┬────────┘
        │ 8. Fetch status
        ▼
     User (Web)
```

### 3.2 STT Conversion Workflow

```
User Action (Web)
       │
       │ 1. Click "Convert" button
       ▼
┌────────────────┐
│  Workers API   │
│  POST /api/    │
│ recordings/:id/│
│      stt       │
└───────┬────────┘
        │ 2. Trigger STT job
        ▼
┌────────────────┐
│ Vultr Recorder │
└───────┬────────┘
        │ 3. Download MP3
        ▼
┌────────────────┐
│   R2 Storage   │
└───────┬────────┘
        │ 4. Local file
        ▼
┌────────────────┐
│  Whisper API   │
│   (OpenAI)     │
└───────┬────────┘
        │ 5. Text result
        ▼
┌────────────────┐
│ Vultr Recorder │
└───────┬────────┘
        │ 6. Upload text
        ▼
┌────────────────┐
│   R2 Storage   │
└────────────────┘
        │
        │ 7. Update STT status
        ▼
┌────────────────┐
│  Workers API   │
│  PUT /api/     │
│internal/       │
│recordings/:id/ │
│      stt       │
└───────┬────────┘
        │ 8. Update D1
        ▼
┌────────────────┐
│   D1 Database  │
└───────┬────────┘
        │ 9. Fetch result
        ▼
     User (Web)
```

---

## 4. Security Architecture

### 4.1 Authentication Flow

```
┌──────────────┐
│  User (Web)  │
└──────┬───────┘
       │ 1. Login
       ▼
┌──────────────┐
│    Clerk     │
│  Auth Server │
└──────┬───────┘
       │ 2. JWT Token
       ▼
┌──────────────┐
│  User (Web)  │
└──────┬───────┘
       │ 3. API Request + JWT
       ▼
┌──────────────┐
│ Workers API  │
│ (Middleware) │
└──────┬───────┘
       │ 4. Validate JWT
       ▼
┌──────────────┐
│    Clerk     │
│   Validate   │
└──────┬───────┘
       │ 5. User ID
       ▼
┌──────────────┐
│ Workers API  │
│  (Handler)   │
└──────┬───────┘
       │ 6. Query with user_id
       ▼
┌──────────────┐
│ D1 Database  │
└──────────────┘
```

### 4.2 Security Layers

**Frontend Security:**
- Clerk SDK for secure authentication
- HTTPS-only (enforced by Cloudflare)
- CSP headers for XSS protection
- No sensitive data in localStorage

**API Security:**
- JWT token validation (Clerk)
- API key authentication for internal endpoints
- Rate limiting (Cloudflare Workers)
- User-based data isolation (user_id check)

**Recording Server Security:**
- API key authentication
- IP whitelist (Cloudflare only)
- No public endpoints
- Secure credential storage (env vars)

**Storage Security:**
- R2 signed URLs (1-hour expiration)
- Private bucket (no public access)
- User-scoped file paths: `users/{user_id}/recordings/{file}`

---

## 5. Scalability Considerations

### 5.1 Horizontal Scaling

**Frontend (Cloudflare Pages):**
- Auto-scales globally via Cloudflare CDN
- No configuration needed

**API (Cloudflare Workers):**
- Auto-scales to handle traffic spikes
- 0-100k requests/day on free tier

**Recording Server (Vultr VPS):**
- Current: Single VPS (1 vCPU / 1GB RAM)
- Scale: Add multiple VPS instances with load balancer
- Strategy: Geo-distributed recording servers (Seoul, Tokyo, etc.)

### 5.2 Performance Optimization

**Caching Strategy:**
- Cloudflare CDN caching for static assets
- SWR for client-side data fetching
- D1 query result caching (Workers KV)

**Database Optimization:**
- Index on user_id, station_id, recorded_at
- Pagination for large result sets
- Scheduled cleanup for old recordings

**Storage Optimization:**
- MP3 compression (ffmpeg -q:a 4)
- Lifecycle policy for R2 (delete after 90 days)
- Optional: Move old files to cheaper storage

---

## 6. Monitoring & Observability

### 6.1 Logging

**Frontend:**
- Client-side error tracking (Sentry)
- Analytics (Cloudflare Web Analytics)

**API:**
- Workers request logs (Cloudflare dashboard)
- Custom logging for errors and warnings

**Recording Server:**
- Winston logger with file rotation
- ffmpeg stderr capture
- Whisper API error logging

### 6.2 Metrics

**Key Metrics:**
- Recording success rate
- STT conversion rate
- API response time (p50, p95, p99)
- R2 storage usage
- Whisper API cost tracking

**Alerting:**
- Recording failures (Slack/Email)
- High error rate (>5% in 5min)
- Storage quota warnings (>80%)

---

## 7. Disaster Recovery

### 7.1 Backup Strategy

**Database (D1):**
- Daily automated backups (Cloudflare)
- Export to R2 weekly (custom script)
- Retention: 30 days

**Storage (R2):**
- Versioning enabled
- Cross-region replication (optional)
- User-initiated download as backup

### 7.2 Recovery Procedures

**Database Corruption:**
1. Restore from latest D1 backup
2. Import from R2 export if needed
3. Verify data integrity

**Recording Server Failure:**
1. Missed recordings logged to D1
2. Manual re-scheduling option for users
3. Deploy standby VPS instance

**Cloudflare Outage:**
- Fallback: Direct API access via Vultr (emergency mode)
- Static error page served from external CDN

---

## 8. Future Architecture Enhancements

### 8.1 Phase 2 Improvements

- **Real-time Status Updates**: WebSocket support via Durable Objects
- **Multi-region Recording**: Deploy Vultr VPS in multiple regions
- **Queueing System**: Use Cloudflare Queues for async STT processing
- **Search**: Full-text search on STT results (D1 FTS extension)

### 8.2 Advanced Features

- **Team Collaboration**: Shared schedules and recordings
- **Mobile App**: React Native with shared API
- **Auto-summarization**: LLM integration for content summaries
- **Keyword Alerts**: Real-time notification on keyword detection

---

## 9. Technology Decisions

### 9.1 Why Cloudflare?

**Pros:**
- Free tier covers most services (Pages, Workers, D1, R2)
- Global edge network for low latency
- Integrated platform (no complex networking)
- Excellent developer experience

**Cons:**
- D1 is still in beta (limited features)
- Vendor lock-in risk
- Cold start latency (Workers)

### 9.2 Why Vultr VPS?

**Pros:**
- Seoul region for low latency to Korean radio stations
- Full control over ffmpeg and recording process
- Cost-effective ($5/month)
- Reliable uptime

**Cons:**
- Single point of failure
- Manual scaling required
- Maintenance overhead

### 9.3 Why Next.js?

**Pros:**
- Modern React framework with excellent DX
- App Router for better performance
- Easy deployment to Cloudflare Pages
- Strong TypeScript support

**Cons:**
- Larger bundle size than alternatives
- Complex configuration for advanced use cases

---

## 10. Deployment Architecture

### 10.1 Development Environment

```
Developer Machine
       │
       ├─► apps/web/        (localhost:3000)
       ├─► apps/api/        (wrangler dev)
       └─► packages/recorder/ (ts-node-dev)
```

### 10.2 Production Environment

```
GitHub Repository
       │
       │ Push to main
       ▼
┌─────────────────┐
│  GitHub Actions │
└────────┬────────┘
         │
         ├──► Deploy Frontend ──► Cloudflare Pages
         ├──► Deploy API ──────► Cloudflare Workers
         └──► Build Recorder ──► Docker Image
                                        │
                                        │ Pull & Deploy
                                        ▼
                                 Vultr VPS (Docker)
```

### 10.3 CI/CD Pipeline

**Frontend:**
1. Build Next.js (npm run build)
2. Deploy to Cloudflare Pages (automatic)

**API:**
1. Type check (tsc --noEmit)
2. Deploy via Wrangler CLI (wrangler deploy)

**Recorder:**
1. Build Docker image
2. Push to registry
3. SSH to Vultr and pull latest image
4. Restart container with docker-compose

---

## Appendix

### A. Technology Version Matrix

| Technology | Version | Notes |
|------------|---------|-------|
| Node.js | 20 LTS | For recorder server |
| Next.js | 14+ | App Router required |
| Hono | 4+ | Latest stable |
| ffmpeg | 6+ | With HLS support |
| Whisper API | v1 | OpenAI API |
| Cloudflare D1 | Beta | SQLite compatible |

### B. Resource Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Workers CPU | 10ms (free) / 50ms (paid) | Per request |
| Workers Memory | 128MB | Per request |
| D1 Storage | 5GB (free) / unlimited (paid) | SQLite database |
| R2 Storage | 10GB free, then $0.015/GB | Object storage |
| ffmpeg RAM | ~200MB | Per recording instance |

### C. External Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| Clerk | Authentication | None (critical) |
| OpenAI | Whisper API | Local Whisper model |
| Radio Stations | HLS streams | None (source-dependent) |
| Cloudflare | Infrastructure | Migrate to AWS/Vercel |
