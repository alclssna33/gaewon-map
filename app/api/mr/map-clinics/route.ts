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

  // ── RPC 함수 호출 (DB 내 실행 → 왕복 1회, 1,000건 제한 없음) ──────
  const { data, error } = await supabase.rpc('get_map_clinics', {
    p_years:         years,
    p_specialty:     specialty,
    p_map_mode:      mapMode,
    p_facility_type: facilityType,
  })

  if (error) {
    // RPC 함수 미등록 시 fallback: range 루프 방식
    if (error.code === 'PGRST202') {
      return NextResponse.json(
        { error: 'RPC 함수 미등록. Supabase SQL Editor에서 rpc_get_map_clinics.sql 실행 필요.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
