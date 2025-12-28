# Local Development Guide

이 가이드는 Felix Radio를 로컬 환경에서 개발하는 방법을 설명합니다.

## 🎯 Quick Start

### Option 1: Mock Mode (Frontend Only)
가장 빠른 시작 방법 - Clerk 인증 + Mock 데이터

```bash
./scripts/dev-start.sh
```

- ✅ Clerk 인증 활성화
- ✅ Mock 데이터 사용
- ✅ Backend API 불필요
- 📍 http://localhost:3000

### Option 2: Full Stack (Frontend + Backend)
실제 API와 D1 데이터베이스 사용

```bash
./scripts/dev-full.sh
```

- ✅ Next.js Frontend (http://localhost:3000)
- ✅ Workers API (http://localhost:8787)
- ✅ 실제 D1 Database
- ✅ Clerk 인증

### Option 3: Individual Services
각 서비스를 개별적으로 실행

```bash
# Frontend
cd apps/web && npm run dev

# Backend API
cd apps/api && pnpm dev

# Recorder (Vultr VPS에서만 필요)
cd packages/recorder && pnpm dev
```

## 📋 Prerequisites

### 필수 요구사항
- Node.js 20+
- pnpm 8+
- Cloudflare 계정 (wrangler login 완료)

### Cloudflare 설정
1. **Wrangler 로그인**
   ```bash
   cd apps/api
   npx wrangler login
   ```

2. **D1 Database** (이미 생성됨)
   - Database ID: `43b83794-5a19-459c-bacf-184c11161150`
   - Region: APAC (Seoul)

3. **Environment Variables**
   - `apps/web/.env.local` - Frontend 설정
   - `apps/api/.dev.vars` - Backend 설정

## 🗄️ Database Setup

### Local D1 Database
로컬 D1 데이터베이스는 `pnpm dev` 실행 시 자동으로 생성됩니다.

수동으로 마이그레이션 실행:
```bash
cd apps/api
npx wrangler d1 execute felix-radio-db --local --file=migrations/0001_initial_schema.sql
```

### Remote D1 Database (Production)
프로덕션 데이터베이스 마이그레이션:
```bash
cd apps/api
npx wrangler d1 execute felix-radio-db --remote --file=migrations/0001_initial_schema.sql
```

## 🔑 Authentication

### Clerk Setup
1. **Dashboard**: https://dashboard.clerk.com
2. **API Keys**: https://dashboard.clerk.com/last-active?path=api-keys
3. **환경 변수 설정**:
   ```bash
   # apps/web/.env.local
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # apps/api/.dev.vars
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

### Mock Mode Toggle
Mock mode와 Real API mode 전환:

```bash
# Mock Mode 활성화
# apps/web/.env.local
NEXT_PUBLIC_USE_MOCK_API=true

# Real API Mode (Mock Mode 비활성화)
# NEXT_PUBLIC_USE_MOCK_API=true  # 주석 처리 또는 삭제
```

## 🛠️ Development Workflow

### 1. Initial Setup
```bash
# 프로젝트 클론 후
pnpm install

# Cloudflare 로그인
cd apps/api && npx wrangler login

# 데이터베이스는 이미 생성됨 (43b83794-5a19-459c-bacf-184c11161150)
```

### 2. Start Development
```bash
# Full Stack
./scripts/dev-full.sh

# 또는 개별 실행
cd apps/web && npm run dev          # Terminal 1
cd apps/api && pnpm dev             # Terminal 2
```

### 3. Test Integration
1. Frontend: http://localhost:3000
2. API: http://localhost:8787
3. Sign in with Clerk
4. Create schedule, view recordings

## 📡 API Endpoints

### Public Endpoints
- `GET /api/stations` - 라디오 방송국 목록

### Protected Endpoints (Clerk JWT 필요)
- `GET /api/schedules` - 사용자의 녹음 일정 목록
- `POST /api/schedules` - 새 일정 생성
- `PUT /api/schedules/:id` - 일정 수정
- `DELETE /api/schedules/:id` - 일정 삭제
- `GET /api/recordings` - 녹음 파일 목록
- `GET /api/recordings/:id` - 녹음 파일 상세
- `GET /api/recordings/:id/download` - 녹음 파일 다운로드
- `DELETE /api/recordings/:id` - 녹음 파일 삭제
- `POST /api/recordings/:id/stt` - STT 변환 트리거
- `GET /api/recordings/:id/stt` - STT 결과 조회
- `GET /api/dashboard/stats` - 대시보드 통계

### Internal Endpoints (API Key 필요)
- `GET /api/internal/schedules/pending` - 대기 중인 일정 조회 (Recorder 서버용)
- `POST /api/internal/recordings` - 녹음 메타데이터 생성
- `PUT /api/internal/recordings/:id/stt` - STT 상태 업데이트

## 🔍 Debugging

### API Logs
Workers API 로그는 터미널에 실시간으로 출력됩니다.

### D1 Database Query
로컬 데이터베이스 쿼리:
```bash
cd apps/api
npx wrangler d1 execute felix-radio-db --local --command "SELECT * FROM radio_stations"
```

프로덕션 데이터베이스 쿼리:
```bash
npx wrangler d1 execute felix-radio-db --remote --command "SELECT * FROM radio_stations"
```

### Clear Local Database
```bash
rm -rf apps/api/.wrangler/state/v3/d1
# 다음 실행 시 자동으로 재생성됩니다
```

## 🚨 Troubleshooting

### "Failed to fetch" 에러
- Workers API가 실행 중인지 확인: http://localhost:8787
- `NEXT_PUBLIC_API_URL`이 올바른지 확인
- Mock mode가 비활성화되었는지 확인

### "Unauthorized" 에러
- Clerk keys가 frontend와 backend 모두에 설정되었는지 확인
- 동일한 Clerk application을 사용하는지 확인
- 브라우저에서 로그인 상태 확인

### Database 에러
- 마이그레이션이 실행되었는지 확인
- Database ID가 wrangler.toml에 올바르게 설정되었는지 확인

## 📁 File Structure

```
felix-radio/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── .env.local         # Frontend 환경 변수
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React components
│   │   └── lib/               # API client, types
│   │
│   └── api/                    # Cloudflare Workers API
│       ├── .dev.vars          # Backend 환경 변수
│       ├── wrangler.toml      # Workers 설정
│       ├── src/               # API source code
│       └── migrations/        # D1 migrations
│
├── packages/
│   └── recorder/              # Vultr VPS Recorder
│
└── scripts/
    ├── dev-start.sh          # Frontend only (Mock)
    ├── dev-full.sh           # Full stack
    ├── dev-stop.sh           # Stop all
    └── api-dev-setup.sh      # API setup
```

## 🎓 Next Steps

1. **Create Schedule**: http://localhost:3000/dashboard/schedules
2. **View Recordings**: http://localhost:3000/dashboard/recordings
3. **Test STT**: 녹음 상세 페이지에서 "Convert to Text" 버튼 클릭

---

**Happy coding! 🐱**
