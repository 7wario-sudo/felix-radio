# 📡 Felix Radio - API Specification

> RESTful API documentation for Felix Radio service

| Version | Date | Status |
|---------|------|--------|
| 1.0 | 2024-12-27 | Draft |

---

## 1. Overview

Felix Radio API는 Cloudflare Workers 기반의 RESTful API입니다. Hono 프레임워크를 사용하며, JSON 형식의 요청/응답을 제공합니다.

**Base URL:**
- Production: `https://api.felix-radio.com`
- Development: `http://localhost:8787`

**API Version:** `v1` (현재 버전은 prefix 없음, 향후 `/v1` 추가 예정)

---

## 2. Authentication

### 2.1 User Authentication (Clerk JWT)

**Public API Endpoints:**

모든 `/api/schedules`, `/api/recordings`, `/api/stations` 엔드포인트는 Clerk JWT 토큰 인증이 필요합니다.

**Request Header:**
```http
Authorization: Bearer <clerk_jwt_token>
```

**JWT Validation Flow:**
1. Frontend가 Clerk SDK를 통해 JWT 토큰 발급
2. API 요청 시 Authorization 헤더에 포함
3. Workers middleware가 Clerk 공개키로 토큰 검증
4. 검증 성공 시 `userId` 추출하여 요청 처리

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 2.2 Internal API Authentication (API Key)

**Internal Endpoints:**

`/api/internal/*` 엔드포인트는 Vultr 녹음 서버 전용이며, API Key 인증을 사용합니다.

**Request Header:**
```http
X-API-Key: <internal_api_key>
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Forbidden",
  "message": "Invalid API key"
}
```

---

## 3. Common Response Format

### 3.1 Success Response

**Status Code:** `200 OK` (GET), `201 Created` (POST), `204 No Content` (DELETE)

**Format:**
```json
{
  "data": { /* resource or array */ },
  "meta": {
    "timestamp": "2024-12-27T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### 3.2 Error Response

**Status Codes:**
- `400` Bad Request - Invalid input
- `401` Unauthorized - Missing or invalid auth token
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `409` Conflict - Resource conflict
- `500` Internal Server Error - Server error

**Format:**
```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "validation_error_details"
  },
  "meta": {
    "timestamp": "2024-12-27T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### 3.3 Pagination

**List endpoints support pagination:**

**Request Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)

**Response Format:**
```json
{
  "data": [ /* array of resources */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 4. API Endpoints

### 4.1 Schedules

#### GET /api/schedules

스케줄 목록 조회

**Authentication:** Required (Clerk JWT)

**Query Parameters:**
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 20, max: 100)
- `stationId` (integer, optional) - Filter by station ID
- `isActive` (boolean, optional) - Filter by active status

**Request Example:**
```http
GET /api/schedules?page=1&limit=20&isActive=true
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "schedule_abc123",
      "userId": "user_xyz789",
      "stationId": 1,
      "station": {
        "id": 1,
        "name": "TBN 제주",
        "streamUrl": "https://example.com/stream.m3u8"
      },
      "name": "아침 뉴스",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "startTime": "09:00",
      "durationMins": 60,
      "isActive": true,
      "createdAt": "2024-12-20T10:00:00Z",
      "updatedAt": "2024-12-25T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### POST /api/schedules

새 스케줄 생성

**Authentication:** Required (Clerk JWT)

**Request Body:**
```json
{
  "stationId": 1,
  "name": "저녁 교통정보",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "startTime": "18:00",
  "durationMins": 30,
  "isActive": true
}
```

**Validation Rules:**
- `stationId`: Required, must exist in radio_stations
- `name`: Required, 1-100 characters
- `daysOfWeek`: Required, array of integers (0-6, where 0=Sunday)
- `startTime`: Required, format "HH:mm" (24-hour)
- `durationMins`: Required, 1-300 minutes
- `isActive`: Optional, default: true

**Response (201 Created):**
```json
{
  "data": {
    "id": "schedule_def456",
    "userId": "user_xyz789",
    "stationId": 1,
    "name": "저녁 교통정보",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "18:00",
    "durationMins": 30,
    "isActive": true,
    "createdAt": "2024-12-27T10:30:00Z",
    "updatedAt": "2024-12-27T10:30:00Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "ValidationError",
  "message": "Invalid request data",
  "details": {
    "startTime": "Must be in HH:mm format",
    "durationMins": "Must be between 1 and 300"
  }
}
```

#### PUT /api/schedules/:id

스케줄 수정

**Authentication:** Required (Clerk JWT)

**Path Parameters:**
- `id` (string) - Schedule ID

**Request Body:**
```json
{
  "name": "아침 교통정보 (수정)",
  "daysOfWeek": [1, 2, 3],
  "startTime": "09:30",
  "durationMins": 45,
  "isActive": false
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "schedule_abc123",
    "userId": "user_xyz789",
    "stationId": 1,
    "name": "아침 교통정보 (수정)",
    "daysOfWeek": [1, 2, 3],
    "startTime": "09:30",
    "durationMins": 45,
    "isActive": false,
    "createdAt": "2024-12-20T10:00:00Z",
    "updatedAt": "2024-12-27T11:00:00Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "NotFound",
  "message": "Schedule not found"
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to modify this schedule"
}
```

#### DELETE /api/schedules/:id

스케줄 삭제

**Authentication:** Required (Clerk JWT)

**Path Parameters:**
- `id` (string) - Schedule ID

**Response (204 No Content):**
```
(empty body)
```

**Error Response (404 Not Found):**
```json
{
  "error": "NotFound",
  "message": "Schedule not found"
}
```

---

### 4.2 Recordings

#### GET /api/recordings

녹음 파일 목록 조회

**Authentication:** Required (Clerk JWT)

**Query Parameters:**
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 20, max: 100)
- `scheduleId` (string, optional) - Filter by schedule ID
- `status` (string, optional) - Filter by status (recording/completed/failed)
- `sttStatus` (string, optional) - Filter by STT status (none/processing/completed/failed)
- `startDate` (string, optional) - Filter from date (ISO 8601)
- `endDate` (string, optional) - Filter to date (ISO 8601)

**Request Example:**
```http
GET /api/recordings?page=1&limit=20&status=completed
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "rec_abc123",
      "scheduleId": "schedule_xyz789",
      "userId": "user_xyz789",
      "schedule": {
        "id": "schedule_xyz789",
        "name": "아침 뉴스",
        "station": {
          "id": 1,
          "name": "TBN 제주"
        }
      },
      "filePath": "users/user_xyz789/recordings/2024-12-27_09-00-00.mp3",
      "fileSize": 28672000,
      "durationSecs": 3600,
      "status": "completed",
      "sttStatus": "completed",
      "sttTextPath": "users/user_xyz789/recordings/2024-12-27_09-00-00.txt",
      "recordedAt": "2024-12-27T09:00:00Z",
      "createdAt": "2024-12-27T09:00:00Z",
      "updatedAt": "2024-12-27T10:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### GET /api/recordings/:id

녹음 파일 상세 조회

**Authentication:** Required (Clerk JWT)

**Path Parameters:**
- `id` (string) - Recording ID

**Response (200 OK):**
```json
{
  "data": {
    "id": "rec_abc123",
    "scheduleId": "schedule_xyz789",
    "userId": "user_xyz789",
    "schedule": {
      "id": "schedule_xyz789",
      "name": "아침 뉴스",
      "station": {
        "id": 1,
        "name": "TBN 제주",
        "streamUrl": "https://example.com/stream.m3u8"
      }
    },
    "filePath": "users/user_xyz789/recordings/2024-12-27_09-00-00.mp3",
    "fileSize": 28672000,
    "durationSecs": 3600,
    "status": "completed",
    "sttStatus": "completed",
    "sttTextPath": "users/user_xyz789/recordings/2024-12-27_09-00-00.txt",
    "recordedAt": "2024-12-27T09:00:00Z",
    "createdAt": "2024-12-27T09:00:00Z",
    "updatedAt": "2024-12-27T10:15:00Z"
  }
}
```

#### GET /api/recordings/:id/download

MP3 파일 다운로드 URL 발급

**Authentication:** Required (Clerk JWT)

**Path Parameters:**
- `id` (string) - Recording ID

**Response (200 OK):**
```json
{
  "data": {
    "url": "https://r2.felix-radio.com/users/user_xyz789/recordings/2024-12-27_09-00-00.mp3?X-Amz-Algorithm=...",
    "expiresAt": "2024-12-27T11:30:00Z"
  }
}
```

**Notes:**
- Signed URL은 1시간 동안 유효
- 만료 후 재요청 필요

#### DELETE /api/recordings/:id

녹음 파일 삭제

**Authentication:** Required (Clerk JWT)

**Path Parameters:**
- `id` (string) - Recording ID

**Response (204 No Content):**
```
(empty body)
```

**Notes:**
- R2에서 MP3 및 STT 텍스트 파일 삭제
- D1에서 메타데이터 삭제

---

### 4.3 STT (Speech-to-Text)

#### POST /api/recordings/:id/stt

STT 변환 요청

**Authentication:** Required (Clerk JWT)

**Path Parameters:**
- `id` (string) - Recording ID

**Request Body:**
```json
{
  "language": "ko",
  "model": "whisper-1"
}
```

**Validation Rules:**
- `language`: Optional, default: "ko" (Korean)
- `model`: Optional, default: "whisper-1"

**Response (202 Accepted):**
```json
{
  "data": {
    "recordingId": "rec_abc123",
    "sttStatus": "processing",
    "message": "STT conversion started"
  }
}
```

**Error Response (409 Conflict):**
```json
{
  "error": "Conflict",
  "message": "STT conversion already in progress or completed"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "BadRequest",
  "message": "Recording status is not 'completed'"
}
```

#### GET /api/recordings/:id/stt

STT 변환 결과 조회

**Authentication:** Required (Clerk JWT)

**Path Parameters:**
- `id` (string) - Recording ID

**Response (200 OK) - Processing:**
```json
{
  "data": {
    "recordingId": "rec_abc123",
    "sttStatus": "processing",
    "progress": 45,
    "message": "Converting audio to text..."
  }
}
```

**Response (200 OK) - Completed:**
```json
{
  "data": {
    "recordingId": "rec_abc123",
    "sttStatus": "completed",
    "text": "오늘 아침 제주 지역 날씨는 맑고 기온은 15도입니다...",
    "downloadUrl": "https://r2.felix-radio.com/users/user_xyz789/recordings/2024-12-27_09-00-00.txt?X-Amz-Algorithm=...",
    "expiresAt": "2024-12-27T11:30:00Z"
  }
}
```

**Response (200 OK) - Failed:**
```json
{
  "data": {
    "recordingId": "rec_abc123",
    "sttStatus": "failed",
    "error": "Whisper API error: Audio file too large"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "NotFound",
  "message": "STT result not available"
}
```

---

### 4.4 Stations

#### GET /api/stations

방송국 목록 조회

**Authentication:** Required (Clerk JWT)

**Query Parameters:**
- `isActive` (boolean, optional) - Filter by active status

**Request Example:**
```http
GET /api/stations?isActive=true
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "TBN 제주",
      "streamUrl": "https://example.com/tbn-jeju/stream.m3u8",
      "isActive": true,
      "createdAt": "2024-12-15T10:00:00Z"
    },
    {
      "id": 2,
      "name": "KBS 제주",
      "streamUrl": "https://example.com/kbs-jeju/stream.m3u8",
      "isActive": true,
      "createdAt": "2024-12-15T10:00:00Z"
    }
  ]
}
```

---

## 5. Internal API Endpoints

### 5.1 Internal - Schedules

#### GET /api/internal/schedules/pending

대기중인 스케줄 조회 (Vultr 서버 전용)

**Authentication:** Required (API Key)

**Query Parameters:**
- `currentTime` (string, required) - Current time in ISO 8601 format

**Request Example:**
```http
GET /api/internal/schedules/pending?currentTime=2024-12-27T09:00:00Z
X-API-Key: internal_secret_key_xyz
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "schedule_abc123",
      "userId": "user_xyz789",
      "stationId": 1,
      "station": {
        "id": 1,
        "name": "TBN 제주",
        "streamUrl": "https://example.com/stream.m3u8"
      },
      "name": "아침 뉴스",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "startTime": "09:00",
      "durationMins": 60,
      "isActive": true
    }
  ]
}
```

**Logic:**
- 현재 시각(`currentTime`)과 일치하는 스케줄 반환
- `isActive=true`인 스케줄만 포함
- 요일(`daysOfWeek`)과 시작 시간(`startTime`) 기준 필터링

---

### 5.2 Internal - Recordings

#### POST /api/internal/recordings

녹음 완료 후 메타데이터 등록 (Vultr 서버 전용)

**Authentication:** Required (API Key)

**Request Body:**
```json
{
  "scheduleId": "schedule_abc123",
  "userId": "user_xyz789",
  "filePath": "users/user_xyz789/recordings/2024-12-27_09-00-00.mp3",
  "fileSize": 28672000,
  "durationSecs": 3600,
  "status": "completed",
  "recordedAt": "2024-12-27T09:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "rec_abc123",
    "scheduleId": "schedule_abc123",
    "userId": "user_xyz789",
    "filePath": "users/user_xyz789/recordings/2024-12-27_09-00-00.mp3",
    "fileSize": 28672000,
    "durationSecs": 3600,
    "status": "completed",
    "sttStatus": "none",
    "recordedAt": "2024-12-27T09:00:00Z",
    "createdAt": "2024-12-27T10:00:00Z"
  }
}
```

#### PUT /api/internal/recordings/:id/stt

STT 변환 결과 업데이트 (Vultr 서버 전용)

**Authentication:** Required (API Key)

**Path Parameters:**
- `id` (string) - Recording ID

**Request Body:**
```json
{
  "sttStatus": "completed",
  "sttTextPath": "users/user_xyz789/recordings/2024-12-27_09-00-00.txt"
}
```

**Validation Rules:**
- `sttStatus`: Required, one of: processing/completed/failed
- `sttTextPath`: Optional, required if status is "completed"
- `error`: Optional, error message if status is "failed"

**Response (200 OK):**
```json
{
  "data": {
    "id": "rec_abc123",
    "scheduleId": "schedule_abc123",
    "userId": "user_xyz789",
    "filePath": "users/user_xyz789/recordings/2024-12-27_09-00-00.mp3",
    "fileSize": 28672000,
    "durationSecs": 3600,
    "status": "completed",
    "sttStatus": "completed",
    "sttTextPath": "users/user_xyz789/recordings/2024-12-27_09-00-00.txt",
    "recordedAt": "2024-12-27T09:00:00Z",
    "createdAt": "2024-12-27T09:00:00Z",
    "updatedAt": "2024-12-27T10:15:00Z"
  }
}
```

---

## 6. Rate Limiting

**Cloudflare Workers Rate Limits:**

- Free tier: 100,000 requests/day
- Paid tier: Unlimited requests

**Per-User Rate Limits:**

- Schedules: 100 requests/minute
- Recordings: 100 requests/minute
- STT conversion: 10 requests/minute

**Response (429 Too Many Requests):**
```json
{
  "error": "RateLimitExceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1703678400
```

---

## 7. Webhooks (Future)

### 7.1 Recording Completed

**Event:** `recording.completed`

**Payload:**
```json
{
  "event": "recording.completed",
  "timestamp": "2024-12-27T10:00:00Z",
  "data": {
    "recordingId": "rec_abc123",
    "userId": "user_xyz789",
    "scheduleId": "schedule_xyz789",
    "filePath": "users/user_xyz789/recordings/2024-12-27_09-00-00.mp3",
    "fileSize": 28672000,
    "durationSecs": 3600
  }
}
```

### 7.2 STT Completed

**Event:** `stt.completed`

**Payload:**
```json
{
  "event": "stt.completed",
  "timestamp": "2024-12-27T10:15:00Z",
  "data": {
    "recordingId": "rec_abc123",
    "userId": "user_xyz789",
    "sttTextPath": "users/user_xyz789/recordings/2024-12-27_09-00-00.txt",
    "textPreview": "오늘 아침 제주 지역 날씨는..."
  }
}
```

---

## 8. Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ValidationError` | 400 | Request validation failed |
| `Unauthorized` | 401 | Missing or invalid auth token |
| `Forbidden` | 403 | Insufficient permissions |
| `NotFound` | 404 | Resource not found |
| `Conflict` | 409 | Resource state conflict |
| `RateLimitExceeded` | 429 | Too many requests |
| `InternalServerError` | 500 | Server error |
| `ServiceUnavailable` | 503 | Service temporarily unavailable |

---

## 9. API Client Examples

### 9.1 JavaScript (Frontend)

```javascript
// lib/api.ts
import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchSchedules(page = 1, limit = 20) {
  const { getToken } = useAuth();
  const token = await getToken();

  const response = await fetch(
    `${API_BASE_URL}/api/schedules?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch schedules');
  }

  return response.json();
}

export async function createSchedule(data) {
  const { getToken } = useAuth();
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}/api/schedules`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create schedule');
  }

  return response.json();
}
```

### 9.2 Node.js (Recording Server)

```javascript
// packages/recorder/src/api/client.ts
const API_BASE_URL = process.env.WORKERS_API_URL;
const API_KEY = process.env.INTERNAL_API_KEY;

export async function fetchPendingSchedules(currentTime) {
  const response = await fetch(
    `${API_BASE_URL}/api/internal/schedules/pending?currentTime=${currentTime}`,
    {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch pending schedules');
  }

  return response.json();
}

export async function createRecording(data) {
  const response = await fetch(
    `${API_BASE_URL}/api/internal/recordings`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create recording');
  }

  return response.json();
}
```

---

## 10. OpenAPI Specification

OpenAPI 3.0 specification은 별도 파일로 제공됩니다:

**File:** `docs/openapi.yaml`

**Swagger UI:** `https://api.felix-radio.com/docs` (향후 제공)

---

## Appendix

### A. Response Time SLA

| Endpoint Type | Target (p95) | Max (p99) |
|---------------|--------------|-----------|
| GET (list) | <200ms | <500ms |
| GET (detail) | <100ms | <300ms |
| POST/PUT | <300ms | <700ms |
| DELETE | <200ms | <500ms |
| Internal API | <100ms | <200ms |

### B. Data Size Limits

| Field | Limit |
|-------|-------|
| Schedule name | 100 characters |
| Recording file | 500MB |
| STT text | 10MB |
| Request body | 10MB |
| Response body | 10MB |

### C. Timezone Handling

- All timestamps are in UTC (ISO 8601 format)
- Client responsible for timezone conversion
- `startTime` in schedules uses 24-hour format without timezone
- Recording server uses system timezone (Asia/Seoul)
