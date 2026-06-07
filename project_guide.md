# 연간 개원 지도 — 웹앱 전환 프로젝트 가이드

> 마지막 업데이트: 2026-06-06  
> 작업 중단 후 재개하거나 다른 환경(안티그래비티 등)에서 이어서 진행할 때  
> 이 문서를 먼저 읽고 컨텍스트를 파악한 후 작업을 시작하세요.

---

## Supabase 프로젝트 정보

| 항목 | 값 |
|------|-----|
| 프로젝트명 | Gawon_MAP(monthly) |
| DB 비밀번호 | GMTWhv2vPluqDbQk |
| Project URL | https://auylragkbczepqifagec.supabase.co |
| service_role 키 | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eWxyYWdrYmN6ZXBxaWZhZ2VjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0MTk5OCwiZXhwIjoyMDk2MjE3OTk4fQ.aMJa8xYC1SxsAodYoOKCYkNcyDsedcPIHfYaf1zRegw |

---

## 1. 프로젝트 개요

### 무엇을 만드나?

**개원비밀공간** (cafe.naver.com/anesinformation) 에서 운영 중인 **"연간 개원 지도"** 서비스를  
현재의 `Google Apps Script + Google Sheets` 구조에서  
**독립적인 웹앱 + Supabase DB** 구조로 전환하는 프로젝트.

### 핵심 방향
- 기존 Google Sheets DB → Supabase(PostgreSQL) 이전
- Google Apps Script → Next.js 웹앱으로 전환
- 데이터 수집 자동화 (행안부 API 연동)
- **gaebigong-v2와 통합하지 않는다. 완전히 독립적인 프로젝트.**
- 기존 지도 기능(Leaflet, 과목 필터, 반경 분석)은 그대로 유지

---

## 2. 이 폴더 구조

```
11.연간개원지도_개원포화도/
├── project_guide.md              ← 이 파일 (연간개원지도 웹앱 전환 가이드)
│
├── code.txt                      ← 현재 운영 중인 GAS 서버 코드 (백업)
├── index.txt                     ← 현재 운영 중인 GAS HTML/JS 프론트엔드 (백업)
├── 백업/
│   ├── code.txt
│   └── index.txt
│
├── 개원포화도/                    ← 별개 프로젝트! (포화도 분석 Streamlit 앱)
│   └── project_guide.md          ← 개원포화도 프로젝트 가이드 (별도 관리)
│
├── 연간 개원 지도(20).xlsx        ← 참고용 데이터
├── 전국 병의원 및 약국 현황 2025.9/
└── 건강보험심사평가원_요양기관 개설 현황_20241231.csv
```

---

## 3. 기존 GAS 구조 (현재 운영 중)

### Google Sheets DB 구조

연도별 스프레드시트 9개, 각 스프레드시트 내 진료과목별 시트로 구성.

**SHEET_MAP (code.txt 기준)**
```javascript
"-09":  "1dwwuPb2xFajdnqPsZz-G3jAPMVRz_1CdIdLzFeB-KMk"  // ✅ 공개 (2026-06-05 공개 전환)
"10-19":"1JqOQQbqbD2Ddooki60eW1BFIKi2iqPLPsr-GS3hbgN4"  // ✅ 공개 (2026-06-05 공개 전환)
"2020": "1reOJ6RFtn4Q5aBgyQ7H2OS7tLaUc_m_ai9NzimIId-8"  // ✅ 공개
"2021": "1YlsSdcpq1M60mAZB0qeFvBc-sp8VEUhOkrbzIp5oY-0"  // ✅ 공개
"2022": "1bdPc2bStJunZvag5xl3rkpMUXxIWqQT1WCd1CAF39Zc"  // ✅ 공개
"2023": "1Db8OIJOWVhyTuUq7pxvahAcXsCcqaBLVFPhzvl6pG4w"  // ✅ 공개
"2024": "1jxYF-qhzphxGScTM76Dukazsbsp9Q4od07kFu48Dfuo"  // ✅ 공개
"2025": "1AjR-mwBY9QBPMyTWaBqAaaExjU_YCcFVW17rHkJ88pE"  // ✅ 공개 (샘플)
"26.1": "19pP-hiBcdstdR8lAhesx50VRnLncDkQIaeoESghPU94"  // ✅ 공개
```

> ⚠️ **구 시트 (-09, 10-19) 컬럼 주의**: 최신 시트(7컬럼)와 달리 **8컬럼** 구조.  
> 헤더: `날짜, 주소, 의원명, 의료인수, 평수, [위도], [경도], [빈열]`  
> 평수 데이터 대부분 비어 있음. 날짜 형식도 다름 (`"2002. 12. 16"` 등).  
> 마이그레이션 스크립트는 `iloc[5]`, `iloc[6]`으로 위도·경도를 읽으므로 정상 동작.

**제외 시트:** `계획, 그래프, 지역순, 붙여넣기, 붙여넣기2, 의원`

**과목 시트 목록 (2025 기준):**
`통증관련, 가정의학과, 내과, 비뇨기과, 산부인과, 성형외과, 소아청소년과, 안과, 이비인후과, 정신과, 피부과, 일반의, 병원`

**각 과목 시트 컬럼 구조 (7개, 헤더 1행 후 데이터)**
| 컬럼 | 내용 | 타입 |
|------|------|------|
| A | 날짜 (인허가일자) | YYYY-MM-DD (또는 "2026. 1. 23" 혼재) |
| B | 주소 | 문자열 |
| C | 의원명 | 문자열 |
| D | 의료인수 | 정수 |
| E | 평수 | 정수 |
| F | 위도 (WGS84) | 실수 |
| G | 경도 (WGS84) | 실수 |

---

## 4. 신규 아키텍처

### 기술 스택

| 역할 | 기술 | 비용 |
|------|------|------|
| DB | Supabase (PostgreSQL) | 무료 |
| 프론트엔드 | Next.js + Leaflet.js | - |
| 데이터 파이프라인 | Python 스크립트 | - |
| 호스팅 | Vercel | 무료 |

### 전체 흐름

```
[데이터 소스]
  ① 기존 Google Sheets (2020~26.1) — 1회 마이그레이션
  ② 행안부 API (data.go.kr/15154874) — 매일 업데이트
  ③ HIRA xlsx (건보심평원) — 분기별 보완 (의사수·평수)

            ↓ Python 파이프라인 (개원포화도/scripts/)

[Supabase PostgreSQL]
  clinics 테이블 (단일 테이블)

            ↓ supabase-js / REST API

[Next.js 웹앱] — 별도 레포지토리 (미생성)
  Leaflet 지도 + 연도/과목 필터 + 반경 분석 모달
```

### 데이터 소스 (확정)

| 역할 | API | 엔드포인트 | 주기 |
|------|-----|-----------|------|
| **주/월 업데이트** | **행안부 건강_의원 조회서비스** | `apis.data.go.kr/1741000/clinics/info` | 매일 갱신 (주 1회 실행) |
| **분기 보완** | HIRA xlsx 다운로드 | 건강보험심사평가원 포털 수동 다운로드 | 분기 1회 |

### 행안부 API 상세 (확정, 2026-06-05 검증 완료)

- **Endpoint**: `https://apis.data.go.kr/1741000/clinics/info`
- **API 키**: `MOGAHA_API_KEY` (.env 참조)
- **업데이트**: 매일 갱신, 2일 전 기준 현행화
- **총 레코드**: 125,044건 (전국 의원 전체), 126페이지 (1000건/페이지)
- **이력조회**: `/history` 엔드포인트 (필수 파라미터 미확인 — 추후 Swagger 확인 필요)

**제공 필드 (주요):**

| 필드 | 내용 | 비고 |
|------|------|------|
| `LCPMT_YMD` | 인허가일자 | YYYY-MM-DD |
| `BPLC_NM` | 의원명 | |
| `ROAD_NM_ADDR` | 도로명주소 | |
| `MDEXM_SBJCT_CN_NM` | **진료과목명** | 직접 제공 — 자동분류 불필요 |
| `HCWKR_CNT` | 의료인수 | |
| `GFA` | 면적(㎡) | ÷3.3058 → 평 |
| `CRD_INFO_X/Y` | 좌표 Bessel TM | pyproj → WGS84 변환 |
| `MNG_NO` | 관리번호 | mogaha_id로 사용 |
| `DAT_UPDT_SE` | I=신규, U=수정, D=폐업 | I만 처리 |

**업데이트 방식:**
```
전체 126페이지 순회 (약 3~4분 소요)
  → DAT_UPDT_SE = "I" (신규개원) 필터
  → LCPMT_YMD >= DB 최신 날짜 필터
  → Bessel TM 좌표 → WGS84 변환
  → 면적 ㎡ → 평 변환
  → specialty_confirmed=FALSE (분기 HIRA xlsx로 TRUE 교정)
  → mogaha_id(MNG_NO)로 추적
```

---

## 5. DB 스키마 (Supabase)

> Supabase 프로젝트: **Gawon_MAP(monthly)** (`auylragkbczepqifagec`)  
> 적용 파일: schema.sql → schema_v2.sql → schema_v3.sql (순서대로 모두 적용 완료)

### 테이블: `clinics` (전체 컬럼)

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | BIGSERIAL | PK | 자동 증가 ID |
| `license_date` | DATE | - | 인허가일자 (YYYY-MM-DD) |
| `name` | TEXT | NOT NULL | 의원명 |
| `address` | TEXT | - | 도로명주소 |
| `specialty` | TEXT | - | 진료과목 (내과, 피부과, 통증관련 등) |
| `year_group` | TEXT | - | 연도 그룹 (-09, 10-19, 2020~2025, 26.1~26.N) |
| `staff_count` | INTEGER | - | 의료인수 |
| `area_pyeong` | NUMERIC(8,2) | - | 면적(평) |
| `lat` | NUMERIC(12,8) | - | 위도 WGS84 |
| `lng` | NUMERIC(12,8) | - | 경도 WGS84 |
| `source` | TEXT | `'sheets'` | 데이터 출처 (아래 표 참조) |
| `ext_id` | TEXT | UNIQUE | MD5(정규화된 의원명\|\|주소) — 중복 방지 키 |
| `mogaha_id` | TEXT | - | 행안부 관리번호 (MNG_NO) |
| `hira_ykiho` | TEXT | - | HIRA 암호화요양기호 |
| `specialty_confirmed` | BOOLEAN | `FALSE` | FALSE=자동분류, TRUE=HIRA xlsx 확인 완료 |
| `is_closed` | BOOLEAN | `FALSE` | 폐업 여부 |
| `closed_date` | DATE | - | 폐업일자 |
| `is_transfer` | BOOLEAN | `FALSE` | 양수양도 추정 여부 (같은 주소 폐업→신규) |
| `transfer_date` | DATE | - | 이전 의원 폐업일 (양수양도 참고용) |
| `updated_at` | TIMESTAMPTZ | NOW() | 마지막 업데이트 시각 (트리거 자동 갱신) |
| `created_at` | TIMESTAMPTZ | NOW() | 최초 삽입 시각 |

### source 컬럼 값 의미

| source | 의미 | specialty_confirmed |
|--------|------|---------------------|
| `sheets` | 원본 Google Sheets 마이그레이션 (초기 38,004건) | FALSE |
| `mogaha` | 행안부 API 주간 업데이트 (의원명 자동분류) | FALSE |
| `hira_api` | HIRA API 임시 업데이트 (2026-06-05 1회) | FALSE |
| `hira` | HIRA xlsx 분기 업데이트 (공식 과목명) | TRUE |
| `mogaha+hira` | 행안부 + HIRA 양쪽 확인 | TRUE |

### 인덱스 목록

| 인덱스 | 대상 컬럼 | 용도 |
|--------|----------|------|
| `idx_clinics_specialty` | specialty | 과목 필터 |
| `idx_clinics_year_group` | year_group | 연도 필터 |
| `idx_clinics_license_date` | license_date | 날짜 범위 조회 |
| `idx_clinics_lat_lng` | lat, lng | 좌표 조회 |
| `idx_clinics_mogaha_id` | mogaha_id | 행안부 관리번호 조회 |
| `idx_clinics_hira_ykiho` | hira_ykiho | HIRA 요양기호 조회 |
| `idx_clinics_source` | source | 소스별 조회 |
| `idx_clinics_confirmed` | specialty_confirmed | 확인 여부 필터 |
| `idx_clinics_is_closed` | is_closed | 폐업 필터 |

### 테이블: `mogaha_closed` (2026-06-06 신규 생성)

> 행안부 API 폐업 원천 데이터 전용. clinics 매칭 여부와 무관하게 모든 폐업 기록 저장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | BIGSERIAL | PK |
| `mogaha_id` | TEXT UNIQUE | 행안부 관리번호 |
| `name` | TEXT | 의원명 |
| `address` | TEXT | 도로명주소 |
| `region1` | TEXT | 광역시도 |
| `region2` | TEXT | 시군구 |
| `specialty` | TEXT | 진료과목 |
| `license_date` | DATE | 개설일자 |
| `closed_date` | DATE | 폐업일자 |
| `clinic_id` | BIGINT → clinics.id | clinics 매칭 FK (없으면 NULL) |

- 현재 데이터: **46,908건** (2026-06-06 기준)
- SQL: `16.월별개원흐름/migration_mogaha_closed.sql`

### Row Level Security (RLS)

- 공개 읽기 허용 (`FOR SELECT USING (true)`)
- 쓰기는 service_role 키로만 가능

### 주요 SQL 예시

```sql
-- 2026년 6월 신규 개원 내과 조회
SELECT name, address, license_date, staff_count, area_pyeong
FROM clinics
WHERE specialty = '내과'
  AND year_group = '26.6'
  AND is_closed = FALSE;

-- 이번 달 전체 과목 개원 현황 (표 보기용)
SELECT name, address, specialty, license_date, staff_count, area_pyeong
FROM clinics
WHERE license_date BETWEEN '2026-06-01' AND '2026-06-30'
  AND is_closed = FALSE
ORDER BY address;

-- 양수양도 추정 목록
SELECT name, address, license_date, transfer_date
FROM clinics
WHERE is_transfer = TRUE
ORDER BY license_date DESC;
```

---

## 6. 진행 상황

### ✅ 완료된 작업 (2026-06-05 기준)

**분석 및 설계**
- [x] 기존 GAS 코드(code.txt, index.txt) 구조 분석
- [x] Google Sheets DB 구조 파악 (7컬럼, 과목별 시트, SHEET_MAP)
- [x] 연도별 스프레드시트 공개 여부 확인 (전체 9개 공개)
- [x] 데이터 소스 비교 분석 (행안부 API vs HIRA)
- [x] 아키텍처 결정: 독립 웹앱 (Next.js + Supabase + Vercel)

**Supabase DB**
- [x] 스키마 작성 → `연간개원지도/supabase/schema.sql`
- [x] 마이그레이션 스크립트 → `연간개원지도/scripts/migrate_sheets_to_supabase.py`
- [x] Supabase 프로젝트 생성 (Gawon_MAP(monthly))
- [x] schema.sql 실행 + .env 저장
- [x] Google Sheets → Supabase 마이그레이션 완료 — **총 38,004건** (2026-06-05)
  - -09: 17,121건 / 10-19: 11,506건 / 2020: 1,332건 / 2021: 1,480건
  - 2022: 1,622건 / 2023: 1,490건 / 2024: 1,753건 / 2025: 1,599건 / 26.1: 101건

**Next.js 웹앱**
- [x] 프로젝트 생성 → `C:\projects\gaewon-map`
  - ⚠️ 경로 공백("바탕 화면") 문제로 원래 위치(`연간개원지도/webapp`) 실행 불가
- [x] Leaflet 지도 UI 구현 (연도 체크박스, 과목 필터, 마커 클러스터, 팝업)
- [x] Supabase 연동 API (`/api/clinics`, `/api/specialties`)
- [x] 로컬 동작 확인 완료 → `http://localhost:3000`
- [x] 반경 분석 모달 구현 (주소 geocoding + 반경 내 병원 거리순 목록)
- [x] GitHub push → `alclssna33/gaewon-map`
- [x] Vercel 배포 진행 중 (2026-06-05)

**데이터 파이프라인 (자동화)**
- [x] `supabase/schema_v2.sql` — 소스 추적 컬럼 추가 → Supabase 적용 완료 (2026-06-05)
- [x] `scripts/utils.py` — 좌표변환(Bessel TM→WGS84), 이름정규화, 과목 자동분류
- [x] `scripts/update_from_mogaha.py` — **행안부 API** (`apis.data.go.kr/1741000/clinics/info`)
  - 처음엔 localdata.go.kr 차단 → HIRA API 임시 사용 → 최종 행안부 정식 API로 교체
  - 매일 갱신, 진료과목 직접 제공, 면적·의료인수 포함
  - API 키: `MOGAHA_API_KEY` (행안부 15154874 서비스 전용)
- [x] `scripts/update_from_hira.py` — HIRA xlsx 분기 업데이트
- [x] **첫 행안부 API 업데이트 실행 완료** (2026-06-05)
  - HIRA API로 2026-01-31 ~ 2026-06-05 누락 구간 +497건 수집
  - 행안부 API로 2026-06-01 ~ 2026-06-05 추가 +8건 확인
  - 최신 DB: **38,133건**, 최신 날짜: **2026-06-02**

**배포**
- [x] GitHub push → `alclssna33/gaewon-map`
- [x] Vercel 배포 완료 → **https://gaewon-map.vercel.app**

**year_group 월별 구조 개선** (2026-06-05)
- [x] 2026년 데이터를 연간 단일 → **월별(26.1~26.6)** 로 분리
- [x] DB 교정: `fix_year_group_2026.sql` 실행 완료
- [x] `utils.py` `infer_year_group()` 수정 — 2026년 이후 자동 월별 처리
- [x] `/api/clinics` route 수정 — `year=2026` 입력 시 26.1~26.12 자동 확장
- [x] 프론트엔드 — 현재 연도 월별 체크박스 자동 생성 (매년 코드 변경 불필요)

**폐업 추적 + 양수양도 추정** (2026-06-05)
- [x] `supabase/schema_v3.sql` — `is_closed`, `closed_date`, `is_transfer`, `transfer_date` 컬럼 추가
- [x] `update_from_mogaha.py` — `DAT_UPDT_SE="D"` 감지 → `is_closed=TRUE` / 동일 주소 신규개원 → `is_transfer=TRUE`
- [x] 지도: 헤더에 "🚫 폐업 의원 포함" 체크박스 → 회색 마커로 표시, 팝업에 폐업일 표시
- [x] 지도: 양수양도 추정 의원 팝업에 주황색 배지 "🔄 양수양도 추정: 날짜" 표시

**개원현황 표 보기** (2026-06-05)
- [x] 헤더/접힘 상태 모두 "📊 표로 보기" 버튼 (보라색) 추가
- [x] `/api/table` — from_date, to_date, specialty 파라미터로 데이터 조회
- [x] 테이블 모달:
  - 월간: 연도 + 월 선택 → 해당 월 전체
  - 주간: 연도 + 월 + 주차 선택 → 1주(1~7일), 2주(8~14일), 3주(15~21일), 4주(22~28일), 5주(29~말일)
  - 과목 필터: 전체 / 개별 과목 버튼
  - 기본 정렬: 도로명주소 오름차순 (지역별 파악)
  - 컬럼 클릭 정렬: 사업장명, 도로명주소, 인허가일자, 의료인수, 평수

**개원현황 표 모달 파이차트** (2026-06-07)
- [x] TableModal 헤더에 🥧 그래프 버튼 추가
- [x] 과목별 SVG 파이차트 팝업 (외부 라이브러리 없음, 과목별 고정 색상)
- [x] 슬라이스 내부 건수 + 외부 레이블(과목명·%) + 하단 범례

**과목 필터 개선** (2026-06-07)
- [x] 과목 목록 고정화 (연도에 따라 줄어드는 문제 수정)
- [x] 지도 과목 select에 "전체 과목" 옵션 추가
- [x] "통증관련 (정형/통증/재활)" 표시명 명확화

**표 모달 개원/폐원 탭 분리** (2026-06-07)
- [x] 표 모달 상단에 🟢 개원 / 🔴 폐원 탭 추가
- [x] 지도 모드와 완전히 독립적으로 탭 전환 가능
- [x] 폐원 탭: 헤더 빨간색, 과목 버튼 빨간색, 폐업일 컬럼 추가
- [x] 탭 전환 시 정렬 초기화 (주소 오름차순)

**파이차트 100% 버그 수정** (2026-06-07)
- [x] 단일 과목(100%)일 때 SVG arc 시작=끝 → 아무것도 안 그려지던 문제
- [x] 1개 과목일 때 `<circle>` 요소로 대체, 과목명·100%·건수 중앙 표시
- [x] 파이차트 제목에 개원/폐원 구분 표시

**양수양도 표시** (2026-06-07)
- [x] 지도 팝업: 🔄 양수양도 추정 + 이전 폐업일 배지 (Map.tsx, 기존 구현)
- [x] 표 목록: 사업장명 옆 주황색 🔄 양수양도 배지 추가
- [x] 마우스 오버 시 이전 폐업일 툴팁 표시
- mogaha_registry is_transfer=TRUE: **651건**

**지도 하단 잘림 수정** (2026-06-07)
- [x] `height: 100vh` → `height: 100dvh` (dynamic viewport height)
- [x] 지도 컨테이너 `minHeight: 0` 추가 (flex 자식 shrink 버그 방지)
- [x] globals.css html/body margin/padding 0, overflow hidden 명시
- 원인: `100vh`는 브라우저 탭바·주소창 높이 포함 → 실제 화면보다 크게 계산

### ✅ 현재 상태 (2026-06-07)

mogaha_registry 기반 전환 완료. 개원/폐원 지도·표 분리, 파이차트, 양수양도 배지, 전체화면 수정 완료. 서비스 운영 중.

**gaewon-map.vercel.app 주요 기능 목록:**
- 연도·과목 필터 + 개원🟢/폐원🔴/전체⚪ 지도 토글
- 마커 클러스터, 팝업(과목·개원일·주소·인원·평수·양수양도)
- 규모별/인원별 마커 색상 모드
- 폐원 회색 마커 + 팝업(개원일·폐업일)
- 주소 기반 반경 분석 모달
- 개원현황 표 모달 (월간/주간, 개원/폐원 탭, 과목 필터, 컬럼 정렬)
- 과목별 파이차트 팝업 (SVG)

---

### 📋 폐업 데이터 통합 작업 (2026-06-06 — 16.월별개원흐름과 공동 작업)

> clinics 테이블은 **연간개원지도(11폴더)**와 **월별개원흐름(16폴더)** 양쪽이 공유.
> 폐업 데이터 통합은 16폴더에서 주관하며, 변경 내용은 이 공유 DB에 즉시 반영됨.
> 상세 계획: `16.월별개원흐름/project_guide.md` 13절 참조.

#### 배경

기존 38,133건(구글 시트 마이그레이션)은 `mogaha_id = NULL`로 행안부 API와 연결 불가.  
행안부 API `--sync-closed` 실행 시 폐업 44,792건 발견했으나 매칭 0건으로 실패 (2026-06-06).

#### 확정된 전략

**행안부 API = 폐업 데이터의 단일 원천(Source of Truth)**

```
Step 1 (1회성):
  행안부 전체 API 125,044건 → 이름+지역 매칭 → clinics.mogaha_id 채우기 + 폐업 동시 반영
  스크립트: 16.월별개원흐름/폐업자료/fill_mogaha_id.py

Step 2 (보완):
  mogaha_id 못 채운 나머지 → HIRA 폐업 CSV 4개(2021~2024)로 closed_date만 보완
  스크립트: 16.월별개원흐름/폐업자료/fill_closure_hira_csv.py (예정)

Step 3 (지속):
  기존 update_from_mogaha.py 주간 실행 → mogaha_id 있는 레코드 자동 폐업 반영
```

#### clinics 테이블 영향 (이 작업 완료 후)

| 컬럼 | 변경 내용 |
|------|----------|
| `mogaha_id` | NULL → 행안부 관리번호로 채워짐 (예상 70~85%) |
| `is_closed` | 폐업 의원 TRUE로 업데이트 |
| `closed_date` | 폐업일자 채워짐 |

#### 진행 상태

- [x] Step 1: `fill_mogaha_id.py` 실행 완료 (2026-06-06)
  - mogaha_id 채움: 21,837건 신규 + 16,087건 기존 = 37,924건 (99.5% 커버)
  - clinics 폐업 반영: 2,055건 (is_closed=TRUE, closed_date)
  - mogaha_closed 저장: 49,873건 (폐업 통계 원천 데이터)
  - **이후 행안부 API 주간 업데이트 시 mogaha_id 기준 자동 폐업 반영 가능**
- [x] Step 2: `fill_closure_hira_csv.py` 실행 완료 (2026-06-06)
  - HIRA CSV 4개(2021~2024) → clinics 이름+지역 매칭 → 1,779건 추가 폐업 반영
  - 행안부 API 누락분 보완 완료
- [x] Step 3: 행안부 API 주간 자동 업데이트 체계 확인 — 기존 `update_from_mogaha.py` 그대로 활용

### ✅ gaewon-map mogaha_registry 마이그레이션 완료 (2026-06-07)

> **16.월별개원흐름/project_guide.md 16절** 참조 (상세 계획)

**목적:** gaewon-map을 clinics 테이블에서 mogaha_registry로 이전
- mogaha_registry = 행안부 API 123,841건 전체 (영업중 + 폐업)
- clinics 테이블보다 완전한 개폐원 이력 제공
- 양수양도 감지, 좌표, 면적, 의료인수 포함

**mogaha_registry 현황 (2026-06-07):**
- 전체: 123,841건
- 좌표(lat/lng) 채워진 것: 106,148건 (85.7%)
- year_group 채워진 것: 120,836건 (97.6%)
- 영업중 + 좌표 있음: **71,095건** (지도 표시 가능)

**신규 API 라우트 (gaewon-map):**
- `/api/mr/map-clinics` — 개원(open)/폐원(closed)/전체(all) 모드 지원
- `/api/mr/specialties` — 고정 과목 목록 반환
- `/api/mr/table` — 표 모달용 (폐원 모드 시 closed_date 기준 조회)

**신규 기능:**
- 🟢 개원 / 🔴 폐원 / ⚪ 전체 토글 버튼 (모드별 헤더 색상)
- 폐원 지도: 회색 마커, 팝업에 개원일·폐업일 표시
- 폐원 표 모달: 폐업일 기준 조회, 빨간색 폐업일 컬럼
- **Supabase RPC JSON 방식** (1,000건 제한 완전 해제, 왕복 1회)

**진행 상태:**
- [x] migration_mogaha_registry_v2.sql 실행 (컬럼 추가)
- [x] fill_mogaha_registry.py 3차 실행 (좌표/면적/의료인수 포함)
- [ ] fill_mogaha_transfer.py 실행 (양수양도 감지) — 추후 진행
- [x] gaewon-map API 라우트 교체 (`/api/mr/*`)
- [x] gaewon-map 프론트엔드 연동 완료
- [x] get_map_clinics_json() RPC 함수 구현 + 배포
- [x] GitHub push → Vercel 배포 완료

**✅ Supabase RPC (JSON) 방식으로 완전 해결 (2026-06-07):**
- 기존: range() 페이지 루프 → PostgREST max-rows 1,000건 제한
- 현재: `get_map_clinics_json()` RPC 함수 → RETURNS JSON(json_agg) → 제한 없음
- 성능: DB 내부 집계 → 왕복 **1회** (데이터양 무관)
- 검증: 2025 전체 1,431건, 전체 연도 35,166건 정상 반환 확인

#### 최종 DB 현황 (2026-06-06)

| 항목 | 수치 |
|------|------|
| clinics 전체 | 38,127건 |
| mogaha_id 채워진 비율 | 37,924건 (99.5%) |
| clinics.is_closed=TRUE | ~3,834건 |
| mogaha_closed 테이블 | 46,908건 (폐업 통계 원천) |

#### mogaha_closed 테이블 (신규 생성)

> 행안부 API 폐업 원천 데이터 전용 테이블. 월별·연별 폐업 통계 쿼리용.
> SQL: `16.월별개원흐름/migration_mogaha_closed.sql`

| 컬럼 | 내용 |
|------|------|
| mogaha_id | 행안부 관리번호 (UNIQUE) |
| name / address / region1 / region2 | 의원 정보 |
| specialty | 진료과목 |
| license_date / closed_date | 개설일 / 폐업일 |
| clinic_id | clinics 테이블 FK (매칭된 경우) |

#### 앞으로 폐업 업데이트 운영

**주간 자동 (행안부 API):**
```powershell
python scripts/update_from_mogaha.py
```
- mogaha_id 있는 37,924건 → 폐업 자동 감지(`DAT_UPDT_SE=D`) → `is_closed=TRUE`, `closed_date` 업데이트
- 신규 개원 INSERT도 동시 처리

**연 1회 보완 (HIRA CSV 신규 파일 발행 시):**
```powershell
python 16.월별개원흐름/폐업자료/fill_closure_hira_csv.py
```
- mogaha_id 없는 203건(0.5%) 등 행안부 누락분 보완

> 상세 운영 방법: `16.월별개원흐름/project_guide.md` 13절 참조
- [ ] Step 3: 기존 주간 파이프라인으로 자동 처리 (별도 작업 불필요)

### year_group 연도 전환 정책 (DB 추가 수정 불필요)

```
현재(2026):  [26.1][26.2]...[26.6]  ← 월별 체크박스 (코드가 자동 생성)
2027년 됨:   [2026] 단일 체크박스   ← API에서 26.1~26.12 자동 확장 처리
             [27.1][27.2]...[27.N]  ← 새 연도 월별 체크박스
2028년 됨:   [2026][2027] 단일, [28.1]... 반복
```
→ **DB는 영구적으로 26.N 형태 유지. 수정 불필요.**

### 진료과목 분류 로직 개선 (2026-06-06)

**변경 파일:** `scripts/utils.py`, `scripts/update_from_mogaha.py`

**변경 내용:** `classify_specialty()` 함수를 병원명 기반으로 전면 교체

**기존 방식의 문제:**
- API 과목 필드(`MDEXM_SBJCT_CN_NM`)가 복합 과목 문자열 ("내과, 정형외과, 소아청소년과...")을 반환
- 복합 과목에서 첫 번째 매칭으로 분류 → 통증관련 과대 집계
- "미용"이 성형외과로 잘못 분류

**새 분류 기준 (병원명 기반):**
```
소아청소년과  ← 소아청소년, 소아과
이비인후과    ← 이비인후
정신과        ← 정신건강의학, 신경정신, 정신과
산부인과      ← 산부인과, 여성의원
비뇨기과      ← 비뇨의학, 비뇨기
안과          ← 안과
성형외과      ← 성형외과  (외과보다 먼저 체크)
통증관련      ← 정형외과, 신경외과, 마취통증, 재활의학
외과          ← 흉부외과, (나머지)외과
내과          ← 내과
가정의학과    ← 가정의학
피부과        ← 피부과, 피부, 레이저, 스킨, 탈모, 미용
통증관련(암시) ← 척추, 관절, 통증, 도수, 근골격 / 튼튼의원·척의원·마디의원 등
일반의        ← 위 어디에도 해당 없는 경우
```

**`update_from_mogaha.py` 변경:**
- 기존: `map_specialty(spec_nm)` — API 과목 문자열 기반
- 변경: `classify_specialty(name)` — 병원명 기반 (utils.py 공통 함수 사용)

### 폐업 탐지 방식 및 한계

매주 업데이트 실행 시 행안부 API 전체(125,044건)를 스캔하며 `DAT_UPDT_SE` 필드로 폐업 감지:

| DAT_UPDT_SE | 처리 |
|-------------|------|
| `"I"` (신규개원) | LCPMT_YMD 필터 후 DB 삽입 |
| `"D"` (폐업) | DB에 is_closed=TRUE, closed_date 업데이트 |
| `"U"` (수정) | 무시 |

**한계:** `DAT_UPDT_SE = "D"` 플래그가 API 응답에서 사라진 후에는 탐지 불가. 완벽한 탐지를 위해서는 DB 전체 vs API 전체 diffing이 필요하나 현재는 미구현.

### ⏳ 정기 업데이트 일정

| 구분 | 주기 | 시기 | 소요 시간 | 명령어 |
|------|------|------|-----------|--------|
| **행안부 API** | 월 1회 | 매월 첫째 주 월요일 | 약 21분 | `python scripts/update_from_mogaha.py` |
| **HIRA xlsx** | 분기 1회 | 3월 / 6월 / 9월 / 12월 | 약 10~20분 | `python scripts/update_from_hira.py --data-dir "..."` |

> 행안부 API는 매일 갱신되지만 데이터 특성상 월 1회 실행으로도 충분합니다.  
> HIRA xlsx는 건강보험심사평가원 포털에서 최신 파일 다운로드 후 실행합니다.

---

### 🔔 업데이트 알림 설정 (Windows 작업 스케줄러)

**행안부 API — 매월 1일 알림 팝업 설정:**

PowerShell을 **관리자 권한**으로 열고 실행:

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument @'
-WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('행안부 API 업데이트를 실행해주세요.`n`ncd 연간개원지도`npython scripts/update_from_mogaha.py', '연간개원지도 DB 업데이트 알림', 'OK', 'Information')"
'@
$trigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At "09:00"
Register-ScheduledTask -TaskName "연간개원지도_행안부업데이트" -Action $action -Trigger $trigger -RunLevel Highest
```

**HIRA xlsx — 분기 첫날(3/6/9/12월 1일) 알림 팝업 설정:**

```powershell
$action2 = New-ScheduledTaskAction -Execute "powershell.exe" -Argument @'
-WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('HIRA xlsx 분기 업데이트를 실행해주세요.`n`n1. 건강보험심사평가원 포털에서 최신 파일 다운로드`n2. python scripts/update_from_hira.py 실행', '연간개원지도 HIRA 업데이트 알림', 'OK', 'Information')"
'@
$trigger2 = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -MonthsOfYear March,June,September,December -At "09:00"
Register-ScheduledTask -TaskName "연간개원지도_HIRA업데이트" -Action $action2 -Trigger $trigger2 -RunLevel Highest
```

> 등록 후 **작업 스케줄러(Task Scheduler)** 앱에서 확인 가능합니다.  
> 삭제: `Unregister-ScheduledTask -TaskName "연간개원지도_행안부업데이트" -Confirm:$false`

---

### 업데이트 실행 체크리스트

**행안부 API 업데이트 (월 1회)**
```powershell
cd "c:\Users\alcls\OneDrive\바탕 화면\개비&마봉\개비공자료\11.연간개원지도_개원포화도\연간개원지도"
python scripts/update_from_mogaha.py
# → "완료 - 신규 삽입: N건, 폐업 표시: N건" 메시지 확인
```

**HIRA xlsx 업데이트 (분기 1회)**
```
1. https://www.hira.or.kr → 의료기관찾기 → 데이터 다운로드
   - 필요 파일: 1.병원정보서비스, 5.진료과목정보서비스
2. 파일을 DB_data/ 폴더에 저장
3. 스크립트 실행:
```
```powershell
python scripts/update_from_hira.py --data-dir "경로/전국 병의원 및 약국 현황 YYYY.MM"
# → "완료 - 총 N건 HIRA 업데이트" 메시지 확인
```

**행안부 API 핵심 장점:**
- 진료과목 직접 제공 → 자동분류 오류 없음
- 의료인수·면적 제공, 매일 갱신
- `/history` 엔드포인트 (파라미터 미확인, 추후 활용)

---

## 7. 관련 파일 위치

```
11.연간개원지도_개원포화도/
├── project_guide.md                          ← 이 파일
├── code.txt                                  ← 구 GAS 서버 코드 (백업용, 신규 서비스로 대체됨)
├── index.txt                                 ← 구 GAS HTML/JS (백업용, 신규 서비스로 대체됨)
│
├── 연간개원지도/                              ← 데이터 파이프라인 스크립트
│   ├── .env                                  ← API 키 + Supabase 키
│   ├── .env.example                          ← 환경변수 템플릿
│   ├── supabase/
│   │   ├── schema.sql                        ← 초기 테이블 생성
│   │   ├── schema_v2.sql                     ← 소스 추적 컬럼 (mogaha_id, specialty_confirmed 등)
│   │   ├── schema_v3.sql                     ← 폐업/양수양도 컬럼 (is_closed, is_transfer 등)
│   │   └── fix_year_group_2026.sql           ← 2026년 year_group 월별 교정 (1회성, 완료)
│   └── scripts/
│       ├── migrate_sheets_to_supabase.py     ← 초기 Google Sheets → Supabase 마이그레이션 (완료)
│       ├── update_from_mogaha.py             ← 행안부 API 주간 업데이트 (신규+폐업+양수양도)
│       ├── update_from_hira.py               ← HIRA xlsx 분기 업데이트
│       └── utils.py                          ← 좌표변환, 과목분류, year_group 추론
│
└── 개원포화도/                               ← 별개 프로젝트 (포화도 분석 Streamlit, 건드리지 말 것)

C:\projects\gaewon-map\                       ← Next.js 웹앱 (실제 서비스, GitHub: alclssna33/gaewon-map)
├── app/
│   ├── page.tsx                              ← 메인 페이지 (헤더 + 지도 + 모달들)
│   ├── components/
│   │   ├── Map.tsx                           ← Leaflet 지도 (마커 클러스터, 팝업, 폐업 회색 마커)
│   │   └── TableModal.tsx                    ← 개원현황 표 모달 (월간/주간, 과목 필터, 정렬)
│   └── api/
│       ├── clinics/route.ts                  ← 지도용 데이터 (year_group, specialty, 폐업 필터)
│       ├── specialties/route.ts              ← 과목 목록
│       ├── table/route.ts                    ← 표용 데이터 (날짜 범위, 과목 필터)
│       └── geocode/route.ts                  ← 주소 → 좌표 변환 (반경 분석용)
├── lib/
│   └── supabase.ts                           ← Supabase 클라이언트 + Clinic 타입
├── .env.local                                ← Supabase URL + anon 키 (git 제외)
└── package.json
```

**개발 서버 실행:**
```powershell
cd C:\projects\gaewon-map
npm run dev
# → http://localhost:3000
```

---

## 8. 환경변수

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | supabase.com → Settings → API |
| `SUPABASE_SERVICE_KEY` | service_role 키 (관리자 전용) | supabase.com → Settings → API |
| `PUBLIC_DATA_API_KEY` | 공공데이터포털 인증키 (HIRA 등) | data.go.kr |
| `MOGAHA_API_KEY` | 행안부 건강_의원 API 전용 키 | data.go.kr/data/15154874 |

> `PUBLIC_DATA_API_KEY`: `cbdf3bec60583ed3458c7172c313f751121906f20a8969625a52073c280dbf2d`  
> `MOGAHA_API_KEY`: `6028d996c7f807b92d0720f341d1cde271a20168cb78c365e0ed51ceec2cda4e`

---

## 9. 참고 링크

| 설명 | URL |
|------|-----|
| 샘플 DB 스프레드시트 (2025) | https://docs.google.com/spreadsheets/d/1AjR-mwBY9QBPMyTWaBqAaaExjU_YCcFVW17rHkJ88pE |
| 행안부 의원 조회 API | https://www.data.go.kr/data/15154874/openapi.do |
| 개원비밀공간 카페 | https://cafe.naver.com/anesinformation |

---

## 10. 대용량 조회 성능 — RPC JSON 방식 구현 완료 (2026-06-07)

### 문제 & 해결 과정

**문제:** mogaha_registry 전환 후 2025 전체 개원 조회 시 1,000건만 반환 (Supabase PostgREST max-rows 제한)

**시도 과정:**

| 시도 | 결과 | 문제 |
|------|------|------|
| ① range(0, 99999) 해제 | 실패 | PostgREST 서버 제한 ≠ 클라이언트 range |
| ② RPC RETURNS TABLE | 1,000건 제한 여전함 | PostgREST가 일반 쿼리처럼 제한 적용 |
| ③ RPC RETURNS JSON ✅ | 완전 해제 | DB 내부에서 json_agg 집계 → 단일 JSON 반환 |

### 최종 구현: `get_map_clinics_json()` RPC 함수

```sql
CREATE OR REPLACE FUNCTION get_map_clinics_json(
  p_years TEXT[], p_specialty TEXT DEFAULT '', 
  p_map_mode TEXT DEFAULT 'open', p_facility_type TEXT DEFAULT '의원'
)
RETURNS JSON AS $$
  SELECT json_agg(row_to_json(t))
  FROM (SELECT ... FROM mogaha_registry WHERE ...) t;
$$ LANGUAGE SQL;
```

**핵심:** `RETURNS JSON` (단일 값) → PostgREST가 제한을 적용하지 않음

### 성능 비교

| 방식 | 2025 전체 | 전체 연도 | 왕복 횟수 |
|------|----------|---------|---------|
| range 루프 | 1,000건 (잘림) | 35+ 회 | N회 |
| RPC JSON | **1,431건** | **35,166건** | **1회** |

### API 라우트 구현

**파일:** `C:\projects\gaewon-map\app\api\mr\map-clinics\route.ts`

```typescript
const { data, error } = await supabase.rpc('get_map_clinics_json', {
  p_years: years, p_specialty: specialty, p_map_mode: mapMode,
  p_facility_type: facilityType,
})
return NextResponse.json(Array.isArray(data) ? data : [])
```

### 왜 이 방법이 최고인가

1. **왕복 최소화:** DB에서 모든 집계 완료 후 결과 1개 전달
2. **무제한 확장성:** 데이터가 수십만 건으로 늘어도 왕복은 1회
3. **인덱스 활용:** SQL 실행이 DB 내부 → 인덱스 풀 활용 가능
4. **구현 간단:** 함수 1개 + API 1줄 변경

### 파일 위치

| 파일 | 설명 |
|------|------|
| `연간개원지도/supabase/rpc_get_map_clinics_v2.sql` | SQL 함수 정의 |
| `C:\projects\gaewon-map\app\api\mr\map-clinics\route.ts` | API 라우트 |

### 추가 고려사항 (향후 작업)

**뷰포트 기반 로딩** (선택사항)
- 현재 RPC JSON으로 충분하지만, 지도가 수십만 건 이상으로 커지면 고려
- 구현: `map.getBounds()` → lat/lng 경계 WHERE 조건 → DB 내 필터
- 장점: 화면에 보이는 것만 로드 (지도 이동 시 재조회)
- 구글맵·네이버지도 표준 방식

---

---

## 11. 주의사항

- 이 프로젝트는 `개원포화도/` (포화도 분석 Streamlit 앱) 와 **별개**입니다.
- `개원포화도/`에 이미 Supabase가 구성되어 있음 (`lezxlbdweqeaionzpqqj`, 545,059건 이관 완료). 연간개원지도용 Supabase는 **별도 프로젝트**로 생성해야 합니다.
- `-09`, `10-19` 스프레드시트는 비공개 설정이므로, 마이그레이션 전에 Google Sheets 공유 설정을 "링크가 있는 모든 사용자가 볼 수 있음"으로 변경하거나, 직접 CSV로 export 후 수동 업로드해야 합니다.
