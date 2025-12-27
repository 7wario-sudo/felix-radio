# 🕰️ Felix Radio - Legacy System Documentation

> Documentation of the existing Ubuntu-based radio recording system

| Version | Date | Status |
|---------|------|--------|
| 1.0 | 2024-12-27 | Reference |

---

## 1. Overview

이 문서는 Felix Radio 구축 이전에 Ubuntu 서버에서 운영되던 기존 라디오 녹음 시스템을 기록합니다. 새로운 시스템 구축 시 참고 자료로 활용됩니다.

**기존 시스템 특징:**
- Ubuntu 서버 기반
- ffmpeg을 사용한 HLS 스트림 녹음
- cron을 사용한 스케줄 관리
- 간단한 bash 스크립트 기반

---

## 2. Installation Process

### 2.1 System Setup

**Ubuntu 서버 초기 설정:**

```bash
# Root 권한 전환
sudo -i

# 시스템 업데이트
apt-get update
apt-get upgrade
apt-get dist-upgrade

# 필수 패키지 설치
apt-get install rtmpdump ffmpeg rdate

# libav-tools 설치 (레거시 패키지)
wget http://launchpadlibrarian.net/348889634/libav-tools_3.4.1-1_all.deb
sudo dpkg -i libav-tools_3.4.1-1_all.deb
```

### 2.2 Working Directory Setup

```bash
# 작업 디렉토리 생성
mkdir /root/radio
cd /root/radio

# 녹음 스크립트 생성
vi tbn_jeju.sh

# 실행 권한 부여
chmod 777 tbn_jeju.sh
```

### 2.3 Timezone Configuration

```bash
# 타임존 설정 (서울)
dpkg-reconfigure tzdata
# → ASIA 선택
# → SEOUL 선택

# Cron 서비스 재시작
systemctl restart cron.service
```

---

## 3. Recording Script

### 3.1 Script: tbn_jeju.sh

**Location:** `/root/radio/tbn_jeju.sh`

**Full Script:**
```bash
#!/bin/bash
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/root/bin

# 라디오 스트림 주소
RADIO_ADDR="http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8"

# 인자로 전달받는 값
PROGRAM_NAME=$1      # 프로그램명 (예: tbn_jeju)
RECORD_MINS=$(($2 * 60))  # 녹음 시간(분) → 초 단위 변환
DEST_DIR=$3          # 저장 디렉토리 (예: /shares/TBN)

# 파일명 생성 (타임스탬프 포함)
REC_DATE=`TZ=Asia/Seoul date +%Y%m%d-%H%M`
MP3_FILE_NAME=$PROGRAM_NAME"_"$REC_DATE.mp3

# ffmpeg 녹음 실행
ffmpeg -t $RECORD_MINS -y -i $RADIO_ADDR $MP3_FILE_NAME &>/dev/null

# 저장 디렉토리 생성 (존재하지 않을 경우)
mkdir -p $DEST_DIR

# 녹음 파일 이동
mv $MP3_FILE_NAME $DEST_DIR
```

### 3.2 Script Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `$1` | 프로그램명 | `tbn_jeju` |
| `$2` | 녹음 시간(분) | `120` (2시간) |
| `$3` | 저장 디렉토리 | `/shares/TBN` |

### 3.3 Usage Examples

```bash
# 2시간 녹음
/root/radio/tbn_jeju.sh tbn_jeju 120 /shares/TBN

# 1시간 녹음
/root/radio/tbn_jeju.sh tbn_jeju 60 /shares/TBN

# 30분 녹음
/root/radio/tbn_jeju.sh tbn_jeju 30 /shares/TBN
```

### 3.4 Generated File Format

**파일명 형식:**
```
{PROGRAM_NAME}_{YYYYMMDD-HHMM}.mp3
```

**예시:**
- `tbn_jeju_20241227-0900.mp3` (2024년 12월 27일 09시 00분)
- `tbn_jeju_20241227-1400.mp3` (2024년 12월 27일 14시 00분)

---

## 4. Cron Schedule

### 4.1 Crontab Configuration

**Location:** `/var/spool/cron/crontabs/root` (또는 `crontab -e`)

**Full Crontab:**
```cron
# 시간 동기화 (매일 오전 3시)
00 03 * * * /usr/bin/rdate -s time.bora.net

# 평일 녹음 (월~금, 오전 9시, 2시간)
00 09 * * 1,2,3,4,5 /root/radio/tbn_jeju.sh tbn_jeju 120 /shares/TBN

# 주말 녹음 (토~일, 오후 2시, 2시간)
00 14 * * 6,7 /root/radio/tbn_jeju.sh tbn_jeju 120 /shares/TBN
```

### 4.2 Schedule Breakdown

| 시간 | 요일 | 녹음 시간 | 설명 |
|------|------|-----------|------|
| 03:00 | 매일 | - | 시간 동기화 (rdate) |
| 09:00 | 월~금 | 2시간 | 평일 아침 방송 녹음 |
| 14:00 | 토~일 | 2시간 | 주말 오후 방송 녹음 |

### 4.3 Cron Format Reference

```
* * * * * command
│ │ │ │ │
│ │ │ │ └─── 요일 (0-7, 0과 7은 일요일)
│ │ │ └───── 월 (1-12)
│ │ └─────── 일 (1-31)
│ └───────── 시 (0-23)
└─────────── 분 (0-59)
```

**요일 코드:**
- 0, 7 = 일요일
- 1 = 월요일
- 2 = 화요일
- 3 = 수요일
- 4 = 목요일
- 5 = 금요일
- 6 = 토요일

---

## 5. Radio Stream Information

### 5.1 TBN 제주 방송

**Stream URL:**
```
http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8
```

**Stream Type:** HLS (HTTP Live Streaming)

**Protocol:** HTTP

**Port:** 1935 (RTMP 기본 포트, HLS 변환)

### 5.2 Stream Details

| Property | Value |
|----------|-------|
| Station | TBN 제주 교통방송 |
| Stream Format | HLS (m3u8 playlist) |
| Protocol | HTTP |
| Server | radio2.tbn.or.kr |
| Port | 1935 |
| Path | /jeju/myStream/playlist.m3u8 |

### 5.3 ffmpeg Command Analysis

**기존 스크립트의 ffmpeg 명령어:**
```bash
ffmpeg -t $RECORD_MINS -y -i $RADIO_ADDR $MP3_FILE_NAME &>/dev/null
```

**옵션 설명:**
- `-t $RECORD_MINS`: 녹음 시간 (초 단위)
- `-y`: 기존 파일 덮어쓰기 (확인 없이)
- `-i $RADIO_ADDR`: 입력 스트림 URL
- `$MP3_FILE_NAME`: 출력 파일명
- `&>/dev/null`: 모든 출력 무시 (stdout, stderr)

**개선 가능한 옵션:**
```bash
# 더 나은 품질 및 로깅
ffmpeg -t $RECORD_MINS \
       -i $RADIO_ADDR \
       -codec:a libmp3lame \
       -q:a 4 \
       -ac 2 \
       -ar 44100 \
       $MP3_FILE_NAME 2>> /var/log/radio-recording.log
```

**옵션 설명:**
- `-codec:a libmp3lame`: MP3 인코더 명시
- `-q:a 4`: 오디오 품질 (0=최고, 9=최저, 4=적정)
- `-ac 2`: 오디오 채널 수 (2=스테레오)
- `-ar 44100`: 샘플링 레이트 (44.1kHz)
- `2>> /var/log/radio-recording.log`: 에러 로그 기록

---

## 6. System Analysis

### 6.1 Strengths

**장점:**
- ✅ 간단한 구조 (bash 스크립트 + cron)
- ✅ 낮은 시스템 요구사항
- ✅ 안정적인 ffmpeg 기반
- ✅ 파일 시스템 직접 접근 (빠른 저장)
- ✅ 설정 변경이 쉬움 (crontab 수정)

### 6.2 Weaknesses

**단점:**
- ❌ 웹 인터페이스 없음 (SSH 접속 필요)
- ❌ 수동 스케줄 관리 (crontab 직접 수정)
- ❌ 녹음 상태 모니터링 불가
- ❌ 에러 처리 부족 (실패 시 알림 없음)
- ❌ 파일 관리 어려움 (수동 삭제 필요)
- ❌ 텍스트 변환(STT) 기능 없음
- ❌ 사용자 인증/권한 관리 없음
- ❌ 확장성 부족 (다른 방송국 추가 어려움)

---

## 7. Migration to Felix Radio

### 7.1 Legacy vs New System

| Feature | Legacy System | Felix Radio |
|---------|--------------|-------------|
| **인터페이스** | SSH (CLI) | Web UI |
| **스케줄 관리** | crontab 수정 | Web 기반 CRUD |
| **녹음 방식** | ffmpeg (bash) | ffmpeg (Node.js) |
| **저장소** | 로컬 파일시스템 | Cloudflare R2 |
| **STT** | 없음 | Whisper API |
| **모니터링** | 없음 | 실시간 상태 조회 |
| **인증** | SSH 키 | Clerk (OAuth) |
| **확장성** | 낮음 | 높음 (멀티 유저) |

### 7.2 Key Improvements

**Felix Radio의 개선 사항:**

1. **사용자 경험**
   - 웹 기반 UI로 접근성 향상
   - 실시간 녹음 상태 모니터링
   - 파일 다운로드 및 관리 간편화

2. **기능 확장**
   - STT 변환 (Whisper API)
   - 다중 사용자 지원
   - 다중 방송국 지원
   - 검색 및 필터링

3. **운영 효율**
   - 자동 백업 (R2)
   - 에러 알림
   - 로그 관리
   - API 기반 통합

4. **확장성**
   - 멀티 리전 녹음 서버
   - 팀 협업 기능
   - 자동 요약 (LLM)
   - 키워드 알림

### 7.3 Migration Checklist

**레거시 시스템에서 가져올 요소:**

- [x] TBN 제주 스트림 URL (`http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8`)
- [x] ffmpeg 녹음 명령어 구조
- [x] 타임존 설정 (Asia/Seoul)
- [x] 파일명 형식 (`{program}_{YYYYMMDD-HHMM}.mp3`)
- [x] 기본 스케줄 (평일 09:00, 주말 14:00, 2시간 녹음)

**새로 추가할 요소:**

- [ ] 웹 기반 스케줄 관리 UI
- [ ] R2 스토리지 통합
- [ ] Whisper STT 변환
- [ ] 사용자 인증 (Clerk)
- [ ] 녹음 상태 실시간 모니터링
- [ ] 에러 핸들링 및 로깅

---

## 8. Implementation Reference

### 8.1 Recorder Script (Node.js Version)

**레거시 스크립트를 Node.js로 변환:**

```typescript
// packages/recorder/src/recorder/ffmpeg.ts

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

interface RecordingOptions {
  streamUrl: string;      // HLS stream URL
  durationSecs: number;   // Recording duration in seconds
  outputPath: string;     // Output file path
}

export async function recordStream(options: RecordingOptions): Promise<void> {
  const { streamUrl, durationSecs, outputPath } = options;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    // ffmpeg command similar to legacy script
    const ffmpeg = spawn('ffmpeg', [
      '-t', durationSecs.toString(),    // Duration in seconds
      '-i', streamUrl,                   // Input stream URL
      '-codec:a', 'libmp3lame',         // MP3 encoder
      '-q:a', '4',                      // Audio quality
      '-ac', '2',                       // Stereo
      '-ar', '44100',                   // Sample rate
      '-y',                             // Overwrite output file
      outputPath
    ]);

    let errorOutput = '';

    // Capture stderr (ffmpeg outputs progress to stderr)
    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`Recording completed: ${outputPath}`);
        resolve();
      } else {
        console.error(`ffmpeg exited with code ${code}`);
        console.error(errorOutput);
        reject(new Error(`Recording failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      console.error('Failed to start ffmpeg:', error);
      reject(error);
    });
  });
}

// Usage example
export async function recordTBNJeju(durationMins: number): Promise<string> {
  const streamUrl = 'http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8';
  const durationSecs = durationMins * 60;

  // Generate filename with timestamp (Asia/Seoul)
  const now = new Date();
  const timestamp = now.toLocaleString('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/[-:\s]/g, '').replace('T', '-');

  const filename = `tbn_jeju_${timestamp}.mp3`;
  const outputPath = path.join('/tmp/recordings', filename);

  await recordStream({
    streamUrl,
    durationSecs,
    outputPath
  });

  return outputPath;
}
```

### 8.2 Database Seed Data

**초기 데이터 (radio_stations 테이블):**

```sql
-- TBN 제주 방송국 추가
INSERT INTO radio_stations (name, stream_url, is_active) VALUES
  ('TBN 제주', 'http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8', 1);
```

### 8.3 Default Schedule Templates

**기본 스케줄 템플릿 (레거시 crontab 기반):**

```typescript
// Default schedules based on legacy crontab
export const DEFAULT_SCHEDULES = [
  {
    name: '평일 아침 방송',
    stationId: 1, // TBN 제주
    daysOfWeek: [1, 2, 3, 4, 5], // 월~금
    startTime: '09:00',
    durationMins: 120, // 2시간
    isActive: true
  },
  {
    name: '주말 오후 방송',
    stationId: 1, // TBN 제주
    daysOfWeek: [6, 7], // 토~일 (0=일요일이므로 7도 일요일)
    startTime: '14:00',
    durationMins: 120, // 2시간
    isActive: true
  }
];
```

---

## 9. Testing Legacy Stream

### 9.1 Manual Testing

**HLS 스트림 연결 테스트:**

```bash
# 10초 테스트 녹음
ffmpeg -t 10 -i http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8 test.mp3

# 스트림 정보 확인
ffprobe http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8

# 스트림 재생 (VLC 사용)
vlc http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8
```

### 9.2 Stream Validation

**체크리스트:**
- [ ] 스트림 URL 접근 가능
- [ ] ffmpeg로 녹음 성공
- [ ] 오디오 품질 확인 (44.1kHz, 스테레오)
- [ ] 파일 크기 정상 (약 1MB/분)
- [ ] 재생 가능 여부 확인

---

## 10. Lessons Learned

### 10.1 What Worked Well

**성공 요인:**
- ffmpeg의 안정성과 범용성
- HLS 스트림의 높은 호환성
- 간단한 bash 스크립트로 충분한 기본 기능
- cron의 신뢰성 있는 스케줄링

### 10.2 Pain Points

**문제점:**
- 웹 인터페이스 부재로 인한 접근성 제약
- 수동 스케줄 관리의 번거로움
- 녹음 실패 시 알림 부재
- 파일 관리 및 검색의 어려움

### 10.3 Design Decisions for Felix Radio

**설계 결정 근거:**

1. **ffmpeg 유지**
   - 검증된 안정성
   - 다양한 스트림 포맷 지원
   - 레거시 시스템과 호환성

2. **Node.js 기반 래퍼**
   - 더 나은 에러 핸들링
   - 비동기 처리
   - 클라우드 통합 용이

3. **클라우드 스토리지 (R2)**
   - 로컬 파일시스템의 용량 제약 해결
   - 멀티 서버 환경 지원
   - 자동 백업 및 복구

4. **웹 기반 UI**
   - SSH 없이 접근 가능
   - 사용자 친화적 스케줄 관리
   - 실시간 모니터링

---

## Appendix

### A. Legacy System Specifications

**서버 사양:**
- OS: Ubuntu (버전 미상)
- RAM: 최소 512MB
- Storage: HDD (녹음 파일 크기에 따라)
- Network: 인터넷 연결 필수

**소프트웨어 버전:**
- ffmpeg: 버전 미상
- rtmpdump: 버전 미상
- libav-tools: 3.4.1-1

### B. File Size Estimation

**녹음 파일 크기 (MP3, 품질 설정에 따라):**

| Duration | Bitrate | File Size |
|----------|---------|-----------|
| 30분 | ~128kbps | ~28MB |
| 1시간 | ~128kbps | ~56MB |
| 2시간 | ~128kbps | ~112MB |

**월간 저장 용량 (기본 스케줄 기준):**
- 평일 (월~금): 5일 × 2시간 = 10시간/주
- 주말 (토~일): 2일 × 2시간 = 4시간/주
- 주간 총합: 14시간/주
- 월간 총합: 14시간 × 4주 = 56시간 ≈ 3.1GB

### C. Troubleshooting Tips

**일반적인 문제 해결:**

1. **녹음이 실행되지 않음**
   ```bash
   # cron 로그 확인
   grep CRON /var/log/syslog

   # 스크립트 직접 실행 테스트
   /root/radio/tbn_jeju.sh tbn_jeju 1 /tmp
   ```

2. **스트림 연결 실패**
   ```bash
   # 네트워크 연결 확인
   ping radio2.tbn.or.kr

   # 스트림 URL 접근 테스트
   curl -I http://radio2.tbn.or.kr:1935/jeju/myStream/playlist.m3u8
   ```

3. **디스크 공간 부족**
   ```bash
   # 디스크 사용량 확인
   df -h

   # 오래된 녹음 파일 삭제
   find /shares/TBN -name "*.mp3" -mtime +90 -delete
   ```

### D. Migration Timeline

**레거시 시스템 마이그레이션 계획:**

1. **Phase 1: Parallel Run** (1-2주)
   - 레거시 시스템 유지
   - Felix Radio 동시 운영
   - 결과 비교 검증

2. **Phase 2: Gradual Migration** (2-4주)
   - 일부 스케줄만 Felix Radio로 이전
   - 안정성 모니터링
   - 사용자 피드백 수집

3. **Phase 3: Full Cutover** (1주)
   - 모든 스케줄 Felix Radio로 이전
   - 레거시 시스템 백업 유지
   - 최종 검증

4. **Phase 4: Decommission** (1주)
   - 레거시 시스템 종료
   - 최종 백업 아카이브
   - 문서화 완료

---

**Note:** 이 문서는 레거시 시스템의 참고 자료이며, Felix Radio 구현 시 필요한 부분만 선택적으로 활용합니다.
