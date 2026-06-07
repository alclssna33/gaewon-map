import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years        = searchParams.getAll('year')
  const specialty    = searchParams.get('specialty') ?? ''
  const mapMode      = searchParams.get('map_mode') ?? 'open'
  const facilityType = searchParams.get('facility_type') ?? '의원'

  if (years.length === 0) return NextResponse.json([])

  // ── get_map_clinics_json RPC ────────────────────────────────────────
  // RETURNS JSON (단일 값) → PostgREST max-rows 1,000건 제한 완전 우회
  // DB 내부에서 json_agg로 집계 후 단일 JSON 반환 → 왕복 1회
  const { data, error } = await supabase.rpc('get_map_clinics_json', {
    p_years:         years,
    p_specialty:     specialty,
    p_map_mode:      mapMode,
    p_facility_type: facilityType,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // supabase-js가 JSON 컬럼을 자동 파싱하므로 data가 바로 배열
  return NextResponse.json(Array.isArray(data) ? data : [])
}
