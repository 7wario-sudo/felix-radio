# 🐱 Felix Radio

> Product Requirements Document (PRD)

| Version | Date | Status |
|---------|------|--------|
| 1.0 | 2024-12-27 | Draft |

---

## 1. Executive Summary

Felix Radio는 라디오 방송을 청취하고 리포트를 작성하는 사용자들을 위한 웹 서비스입니다. 사용자가 설정한 스케줄에 따라 라디오 방송을 MP3로 자동 녹음하고, Whisper API를 통해 텍스트로 변환하여 제공합니다.

'Felix'는 라틴어로 '행운아'를 의미하며, 동시에 유명한 고양이 캐릭터 Felix the Cat에서 영감을 받아 고양이 컨셉의 브랜딩을 적용합니다.

---

## 2. Problem Statement

### 2.1 현재 Pain Points

- 라디오 방송을 실시간으로 청취하기 어려운 시간대 존재
- 수동으로 녹음 스크립트를 관리해야 하는 번거로움
- 녹음된 오디오를 일일이 청취하며 리포트를 작성하는 시간 소요
- 텍스트 검색이 불가능하여 특정 내용 찾기 어려움

### 2.2 Solution

웹 기반 스케줄 관리 + 자동 녹음 + STT 변환을 통합한 원스톱 서비스 제공

---

## 3. Target Users

- 지역 라디오 방송을 모니터링하는 기관/기업 담당자
- 라디오 프로그램 내용을 정리하여 리포트를 작성하는 리서처
- 특정 라디오 프로그램을 아카이빙하고 싶은 개인 사용자

---

## 4. Core Features

### 4.1 사용자 인증 (Clerk)

- 이메일/소셜 로그인 지원
- 사용자별 독립적인 스케줄 및 녹음 파일 관리

### 4.2 녹음 스케줄 관리

- 반복 스케줄 설정 (요일별, 시간대별)
- 라디오 방송국/채널 선택 (초기: TBN 제주)
- 녹음 시간(분) 설정
- 스케줄 활성화/비활성화 토글

### 4.3 자동 녹음

- 설정된 스케줄에 따라 Vultr VPS에서 ffmpeg로 녹음 실행
- 녹음 완료 시 Cloudflare R2에 MP3 파일 업로드
- 녹음 상태 실시간 모니터링 (진행중/완료/실패)

### 4.4 STT 변환 (Whisper API)

- 사용자가 '변환' 버튼 클릭 시 STT 실행
- 변환 진행률 표시
- 변환된 텍스트 R2에 저장 및 웹에서 조회

### 4.5 파일 관리

- 녹음된 MP3 파일 목록 조회
- MP3 파일 다운로드
- STT 텍스트 조회 및 복사
- 파일 삭제

---

## 5. Technical Architecture

### 5.1 System Overview

```
┌─────────────────── Cloudflare ───────────────────┐
│                                                   │
│   Pages          Workers API         R2 Storage   │
│  (Next.js)        (Hono)           (MP3, Text)    │
│     │               │                    ▲        │
│     └───────┬───────┘                    │        │
│             │                            │        │
└─────────────┼────────────────────────────┼────────┘
              │                            │
      ┌───────▼───────┐                    │
      │    Clerk      │                    │
      │   (Auth)      │                    │
      └───────────────┘                    │
                                           │
┌──────────────────────────────────────────┼───────┐
│              Vultr VPS (Seoul)           │       │
│  ┌─────────────────────────────────┐     │       │
│  │  Node.js + node-cron            │     │       │
│  │  - 스케줄 동기화                 │─────┘       │
│  │  - ffmpeg 녹음                  │             │
│  │  - Whisper API 호출             │             │
│  └─────────────────────────────────┘             │
└──────────────────────────────────────────────────┘
```

### 5.2 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js + Tailwind | 사용자 인터페이스 |
| API | Cloudflare Workers + Hono | RESTful API 엔드포인트 |
| Database | Cloudflare D1 | 스케줄, 메타데이터 저장 |
| Storage | Cloudflare R2 | MP3, 텍스트 파일 저장 |
| Auth | Clerk | 사용자 인증/관리 |
| Recording Server | Vultr VPS (Seoul) | 녹음 실행, STT 호출 |
| STT | OpenAI Whisper API | 음성→텍스트 변환 |

### 5.3 Data Flow

#### 녹음 프로세스

1. 사용자가 웹에서 녹음 스케줄 등록
2. 스케줄 정보 Cloudflare D1에 저장
3. Vultr 녹음 서버가 1분마다 D1 폴링하여 스케줄 동기화
4. 예정 시간 도달 시 ffmpeg로 HLS 스트림 녹음 시작
5. 녹음 완료 후 MP3 파일을 R2에 업로드
6. D1에 녹음 메타데이터 저장 (파일명, 크기, 상태)

#### STT 변환 프로세스

1. 사용자가 특정 녹음 파일에서 '변환' 버튼 클릭
2. Workers API가 Vultr 서버에 STT 작업 요청
3. Vultr 서버가 R2에서 MP3 다운로드
4. Whisper API 호출하여 텍스트 변환
5. 변환된 텍스트를 R2에 저장
6. D1에 변환 상태 업데이트

---

## 6. Database Schema

### 6.1 users

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Clerk user ID |
| email | TEXT | 사용자 이메일 |
| created_at | DATETIME | 가입일시 |

### 6.2 radio_stations

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto increment |
| name | TEXT | 방송국명 (예: TBN 제주) |
| stream_url | TEXT | HLS 스트림 URL |
| is_active | BOOLEAN | 활성화 여부 |

### 6.3 schedules

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| user_id | TEXT FK | 사용자 ID |
| station_id | INTEGER FK | 방송국 ID |
| name | TEXT | 스케줄명 |
| days_of_week | TEXT | 요일 (예: "1,2,3,4,5") |
| start_time | TEXT | 시작 시간 (예: "09:00") |
| duration_mins | INTEGER | 녹음 시간(분) |
| is_active | BOOLEAN | 활성화 여부 |

### 6.4 recordings

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| schedule_id | TEXT FK | 스케줄 ID |
| user_id | TEXT FK | 사용자 ID |
| file_path | TEXT | R2 파일 경로 |
| file_size | INTEGER | 파일 크기 (bytes) |
| duration_secs | INTEGER | 녹음 길이 (초) |
| status | TEXT | recording/completed/failed |
| stt_status | TEXT | none/processing/completed/failed |
| stt_text_path | TEXT | STT 결과 파일 경로 |
| recorded_at | DATETIME | 녹음 일시 |

---

## 7. API Endpoints

### 7.1 Schedules

```
GET    /api/schedules          - 스케줄 목록 조회
POST   /api/schedules          - 스케줄 생성
PUT    /api/schedules/:id      - 스케줄 수정
DELETE /api/schedules/:id      - 스케줄 삭제
```

### 7.2 Recordings

```
GET    /api/recordings              - 녹음 파일 목록 조회
GET    /api/recordings/:id          - 녹음 파일 상세 조회
GET    /api/recordings/:id/download - MP3 다운로드 URL
DELETE /api/recordings/:id          - 녹음 파일 삭제
```

### 7.3 STT

```
POST   /api/recordings/:id/stt - STT 변환 요청
GET    /api/recordings/:id/stt - STT 결과 조회
```

### 7.4 Stations

```
GET    /api/stations - 방송국 목록 조회
```

### 7.5 Internal (Recording Server)

```
GET    /api/internal/schedules/pending    - 대기중 스케줄 조회
POST   /api/internal/recordings           - 녹음 결과 등록
PUT    /api/internal/recordings/:id/stt   - STT 결과 업데이트
```

---

## 8. UI Screens

### 8.1 Main Pages

1. **Login Page** - Clerk 로그인 폼
2. **Dashboard** - 최근 녹음 현황, 진행중 녹음, 다음 예정 스케줄
3. **Schedules** - 스케줄 목록, 생성/수정 모달
4. **Recordings** - 녹음 파일 목록, 필터링, 다운로드
5. **Recording Detail** - 오디오 플레이어, STT 변환 버튼, 텍스트 뷰어

### 8.2 Design Concept

- 고양이 캐릭터 로고 (Felix the Cat 영감)
- 메인 컬러: 따뜻한 오렌지 (#F97316) + 네이비 (#1E3A5F)
- 친근하고 직관적인 UI
- 고양이 관련 마이크로 인터랙션 (예: 로딩 시 꼬리 흔들기)

---

## 9. Security Considerations

- Clerk JWT 토큰 기반 API 인증
- Recording Server ↔ Workers API 통신: API Key 인증
- R2 파일 접근: Signed URL (유효기간 1시간)
- 사용자별 데이터 격리 (user_id 기반 접근 제어)

---

## 10. Cost Estimation (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Cloudflare Pages | Free | $0 |
| Cloudflare Workers | Free | $0 |
| Cloudflare D1 | Free | $0 |
| Cloudflare R2 | 10GB Free, then $0.015/GB | $0~5 |
| Clerk | 10K MAU Free | $0 |
| Vultr VPS (Seoul) | 1 vCPU / 1GB RAM | $5 |
| Whisper API | $0.006/min | $10~50* |
| **Total** | | **$15~60** |

> *Whisper 비용: 하루 4시간 녹음 전체를 STT 변환 시 월 ~$43

---

## 11. Development Milestones

### Phase 1: Foundation (Week 1-2)

1. 프로젝트 초기 설정 (monorepo, Cloudflare, Vultr)
2. Clerk 인증 연동
3. D1 스키마 및 기본 API 구현
4. 기본 UI 레이아웃

### Phase 2: Recording (Week 3-4)

1. Vultr 녹음 서버 구축
2. 스케줄 관리 UI 및 API
3. 녹음 실행 및 R2 업로드
4. 녹음 파일 목록 및 다운로드

### Phase 3: STT & Polish (Week 5-6)

- Whisper API 연동
- STT 변환 UI
- 대시보드 완성
- 에러 핸들링 및 테스트
- 배포 및 모니터링 설정

---

## 12. Future Enhancements

- 추가 라디오 방송국 지원
- STT 텍스트 검색 기능
- 자동 요약 (LLM 활용)
- 키워드 알림
- 팀 협업 기능
- 모바일 앱
