"""
행안부 API 전체(125,050건) → mogaha_registry 저장

[목적]
  영업중 + 폐업 모든 레코드를 mogaha_registry에 저장.
  개원일(license_date)과 폐업일(closed_date)을 같은 모집단에서 관리하여
  Graph 1~5 전체를 일관된 데이터로 구동.

[specialty 정규화]
  facility_type별로 다른 매핑 적용:
  - 의원: 정형외과→통증관련, 내과→내과 등
  - 한의원: 한방내과→한방내과, 침구과→침구과 등
  - 치과의원: 치과일반 등

[실행]
  python fill_mogaha_registry.py              # 전체 실행
  python fill_mogaha_registry.py --from-page 300  # 중단 후 재시작
  python fill_mogaha_registry.py --dry-run    # 통계만 출력
"""
import os, sys, re, time, argparse
from pathlib import Path
from collections import defaultdict

import requests
from dotenv import load_dotenv
from supabase import create_client

SCRIPTS_DIR = Path(__file__).parent.parent.parent / "11.연간개원지도_개원포화도" / "연간개원지도" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))
from utils import parse_region, tm_to_wgs84, infer_year_group

load_dotenv(SCRIPTS_DIR.parent / ".env")

SUPABASE_URL   = os.environ["SUPABASE_URL"]
SUPABASE_KEY   = os.environ["SUPABASE_SERVICE_KEY"]
MOGAHA_API_KEY = os.environ["MOGAHA_API_KEY"]

API_URL   = "https://apis.data.go.kr/1741000/clinics/info"
PAGE_SIZE = 100
CLOSED_CODES = {"03", "04"}


# ─── specialty 정규화 (병원명 기반) ──────────────────────────────────────────
#
# 원칙: specialty_raw(API 과목) 대신 병원명(name)으로 분류
#   - 한국 의료법상 전공과목이 병원명에 포함되어야 함
#   - "편한이비인후과의원" → 이비인후과
#   - "베르나의원" → 일반의 (과목 없음)
#
# 외과 계열 disambiguation: 구체적인 것 먼저 체크
#   성형외과 → 정형외과 → 신경외과 → 흉부외과 → (나머지)외과 순으로 체크


def normalize_by_name(name: str) -> str:
    """병원명 기반 진료과목 분류 (의원급 전용)"""

    # ── 소아청소년과 ────────────────────────────────────────
    if "소아청소년" in name or "소아과" in name:
        return "소아청소년과"

    # ── 이비인후과 ──────────────────────────────────────────
    if "이비인후" in name:
        return "이비인후과"

    # ── 정신과 ──────────────────────────────────────────────
    if "정신건강의학" in name or "신경정신" in name or "정신과" in name:
        return "정신과"

    # ── 산부인과 ────────────────────────────────────────────
    if "산부인과" in name or "여성의원" in name:
        return "산부인과"

    # ── 비뇨기과 ────────────────────────────────────────────
    if "비뇨의학" in name or "비뇨기" in name:
        return "비뇨기과"

    # ── 안과 ────────────────────────────────────────────────
    if "안과" in name:
        return "안과"

    # ── 외과 계열 (구체적인 것 먼저 — 순서 중요!) ────────────
    if "성형외과" in name:
        return "성형외과"
    if "정형외과" in name:
        return "통증관련"
    if "신경외과" in name:
        return "통증관련"
    if "마취통증" in name:
        return "통증관련"
    if "재활의학" in name:
        return "통증관련"
    if "흉부외과" in name:
        return "외과"
    if "외과" in name:
        return "외과"          # 일반외과 (성형/정형/신경 제외 후 나머지)

    # ── 내과 ────────────────────────────────────────────────
    if "내과" in name:
        return "내과"

    # ── 가정의학과 ──────────────────────────────────────────
    if "가정의학" in name:
        return "가정의학과"

    # ── 피부과 (미용 포함 — 일반의가 피부 시술 하는 경우) ────
    if any(k in name for k in ["피부과", "피부", "레이저", "스킨", "탈모", "미용"]):
        return "피부과"

    # ── 통증관련 암시 키워드 (이름에 과목 없는 경우) ──────────
    # 사용자 제시: 튼튼의원, 척의원, 마디의원, 제통의원, 본의원, 통의원
    # 추가: 척추, 관절, 통증, 도수, 근골격 포함 이름
    PAIN_KEYWORDS = ["척추", "관절", "통증", "도수", "근골격"]
    PAIN_NAME_PATTERNS = ["튼튼의원", "척의원", "마디의원", "제통의원", "본의원", "통의원"]

    if any(k in name for k in PAIN_KEYWORDS):
        return "통증관련"
    if any(name.endswith(p) or p in name for p in PAIN_NAME_PATTERNS):
        return "통증관련"
    # "마디" 단독 (마디의원처럼)
    if "마디" in name or "제통" in name or "튼튼" in name:
        return "통증관련"

    # ── 일반의 (과목 불명확) ─────────────────────────────────
    return "일반의"


def normalize_specialty(raw: str, facility_type: str, name: str = "") -> str:
    """facility_type별 specialty 분류 — 의원은 이름 기반"""

    if facility_type == "의원":
        return normalize_by_name(name)

    if facility_type == "한의원":
        # 한의원은 대부분 종합 한방 진료 → 이름에서 세부 분류
        if "침구" in name:                  return "침구과"
        if "한방재활" in name:              return "한방재활의학과"
        if "사상체질" in name:              return "사상체질과"
        if "한방부인" in name:              return "한방부인과"
        if "한방소아" in name:              return "한방소아과"
        if "한방신경" in name:              return "한방신경정신과"
        return "한방내과"                   # 기본 = 한방내과

    if facility_type == "치과의원":
        if "교정" in name:                  return "치과교정과"
        if "치주" in name:                  return "치주과"
        if "소아치과" in name:              return "소아치과"
        if "보존" in name:                  return "치과보존과"
        if "보철" in name:                  return "치과보철과"
        if "구강악안면" in name or "구강외과" in name: return "구강외과"
        return "치과일반"

    return facility_type or "기타"


def norm_region2(r2: str) -> str:
    parts = (r2 or "").strip().split()
    return parts[-1] if parts else ""


# ─── API 페이지 조회 ──────────────────────────────────────────────────────────
def fetch_page(page: int) -> tuple[list[dict], int]:
    params = {
        "serviceKey": MOGAHA_API_KEY,
        "pageNo":     page,
        "numOfRows":  PAGE_SIZE,
        "dataType":   "JSON",
    }
    for attempt in range(3):
        try:
            resp = requests.get(API_URL, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            break
        except Exception as e:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

    body  = data["response"]["body"]
    total = int(body.get("totalCount", 0))
    items = body.get("items", {}).get("item", [])
    if isinstance(items, dict):
        items = [items]
    return items, total


# ─── 아이템 파싱 ──────────────────────────────────────────────────────────────
def parse_item(item: dict) -> dict | None:
    mogaha_id     = (item.get("MNG_NO") or "").strip()
    name          = (item.get("BPLC_NM") or "").strip()
    addr          = (item.get("ROAD_NM_ADDR") or item.get("LOTNO_ADDR") or "").strip()
    facility_type = (item.get("MDLCR_INST_BTP_NM") or "").strip() or None
    specialty_raw = (item.get("MDEXM_SBJCT_CN_NM") or "").strip() or None
    lcpmt         = (item.get("LCPMT_YMD") or "").strip()
    clsbiz        = (item.get("CLSBIZ_YMD") or "").strip()
    sals_cd       = (item.get("SALS_STTS_CD") or "").strip()

    if not mogaha_id or not name:
        return None

    region1, region2_raw = parse_region(addr)
    region2 = norm_region2(region2_raw or "")

    is_closed    = sals_cd in CLOSED_CODES or item.get("DAT_UPDT_SE") == "D"
    license_date = lcpmt[:10] if lcpmt and len(lcpmt) >= 10 else None
    closed_date  = clsbiz[:10] if (clsbiz and len(clsbiz) >= 10 and is_closed) else None
    year_group   = infer_year_group(license_date)

    specialty = normalize_specialty(specialty_raw or "", facility_type or "", name)

    # 좌표 변환 (Bessel TM → WGS84)
    lat, lng = None, None
    try:
        x = float(item.get("CRD_INFO_X") or 0)
        y = float(item.get("CRD_INFO_Y") or 0)
        if x and y:
            lat, lng = tm_to_wgs84(x, y)
    except (ValueError, TypeError):
        pass

    # 의료인수 / 면적
    try:
        staff_count = int(item.get("HCWKR_CNT") or 0) or None
    except (ValueError, TypeError):
        staff_count = None

    try:
        gfa = float(item.get("GFA") or 0)
        area_pyeong = round(gfa / 3.3058, 1) if gfa > 0 else None
    except (ValueError, TypeError):
        area_pyeong = None

    return {
        "mogaha_id":     mogaha_id,
        "name":          name,
        "address":       addr or None,
        "region1":       region1,
        "region2":       region2 or None,
        "facility_type": facility_type,
        "specialty_raw": specialty_raw,
        "specialty":     specialty,
        "license_date":  license_date,
        "closed_date":   closed_date,
        "is_closed":     is_closed,
        "year_group":    year_group,
        "lat":           lat,
        "lng":           lng,
        "staff_count":   staff_count,
        "area_pyeong":   area_pyeong,
    }


# ─── 배치 upsert ─────────────────────────────────────────────────────────────
def upsert_batch(supabase, records: list[dict], dry_run: bool) -> None:
    if dry_run or not records:
        return
    # 배치 내 mogaha_id 중복 제거 (마지막 레코드 우선)
    # → "ON CONFLICT DO UPDATE cannot affect row a second time" 오류 방지
    dedup: dict[str, dict] = {}
    for rec in records:
        dedup[rec["mogaha_id"]] = rec
    records = list(dedup.values())
    try:
        supabase.table("mogaha_registry").upsert(
            records, on_conflict="mogaha_id"
        ).execute()
    except Exception as e:
        print(f"\n  [upsert 오류] {len(records)}건: {e}")
        # 오류 시 1건씩 재시도
        for rec in records:
            try:
                supabase.table("mogaha_registry").upsert(
                    [rec], on_conflict="mogaha_id"
                ).execute()
            except Exception as e2:
                print(f"  [스킵] {rec.get('mogaha_id')}: {e2}")


# ─── 메인 ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-page", dest="from_page", type=int, default=1)
    parser.add_argument("--dry-run",   action="store_true")
    args = parser.parse_args()

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    mode = "[DRY RUN] " if args.dry_run else ""
    print(f"\n{mode}행안부 API → mogaha_registry 저장 시작 (p{args.from_page}~)")

    stats = defaultdict(int)
    batch: list[dict] = []
    BATCH_SIZE = 200

    page = args.from_page
    total_pages = None

    failed_pages: list[int] = []

    while True:
        try:
            items, total_count = fetch_page(page)
        except Exception as e:
            # 특정 페이지 400 오류 → 전체 중단 대신 건너뛰고 계속 진행
            print(f"\n[건너뜀] p{page}: {e}")
            failed_pages.append(page)
            if total_pages is None or page < total_pages:
                page += 1
                time.sleep(0.3)
                continue
            break

        if total_pages is None:
            total_pages = (total_count + PAGE_SIZE - 1) // PAGE_SIZE
            print(f"전체 {total_count:,}건 / {total_pages}페이지\n")

        for item in items:
            rec = parse_item(item)
            if not rec:
                stats["skip"] += 1
                continue

            ft = rec.get("facility_type") or "기타"
            stats[f"type_{ft}"] += 1
            if rec["is_closed"]:
                stats["closed"] += 1

            batch.append(rec)

            if len(batch) >= BATCH_SIZE:
                upsert_batch(supabase, batch, args.dry_run)
                stats["saved"] += len(batch)
                batch = []

        print(
            f"  p{page}/{total_pages} | "
            f"저장 {stats['saved']:,} | 의원 {stats.get('type_의원',0):,} | "
            f"한의원 {stats.get('type_한의원',0):,} | 치과 {stats.get('type_치과의원',0):,} | "
            f"폐업 {stats['closed']:,}",
            end="\r", flush=True
        )

        if page >= (total_pages or 1):
            break
        page += 1
        time.sleep(0.1)

    # 남은 배치
    if batch:
        upsert_batch(supabase, batch, args.dry_run)
        stats["saved"] += len(batch)

    print(f"\n\n{'='*55}")
    print(f"{mode}완료")
    print(f"{'='*55}")
    print(f"  총 저장          : {stats['saved']:,}건")
    print(f"  의원             : {stats.get('type_의원',0):,}건")
    print(f"  한의원           : {stats.get('type_한의원',0):,}건")
    print(f"  치과의원         : {stats.get('type_치과의원',0):,}건")
    print(f"  병원 등 기타     : {stats['saved'] - stats.get('type_의원',0) - stats.get('type_한의원',0) - stats.get('type_치과의원',0):,}건")
    print(f"  폐업             : {stats['closed']:,}건")
    print(f"  파싱 스킵        : {stats['skip']:,}건")
    if failed_pages:
        print(f"  건너뛴 페이지    : {len(failed_pages)}개 → {failed_pages}")
        print(f"  재시도 예시      : python fill_mogaha_registry.py --from-page {failed_pages[0]}")


if __name__ == "__main__":
    main()
