import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// "2026" → ['26.1','26.2',...,'26.12']  /  "26.3" → ['26.3']  /  "2025" → ['2025']
function expandYearGroups(years: string[]): string[] {
  const result: string[] = []
  for (const y of years) {
    if (/^\d{4}$/.test(y) && parseInt(y) >= 2026) {
      const short = y.slice(2)
      for (let m = 1; m <= 12; m++) result.push(`${short}.${m}`)
    } else {
      result.push(y)
    }
  }
  return result
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years        = searchParams.getAll('year')
  const specialty    = searchParams.get('specialty') ?? ''
  // map_mode: 'open'(개원·영업중) | 'closed'(폐원) | 'all'(전체)
  const mapMode      = searchParams.get('map_mode') ?? 'open'
  const facilityType = searchParams.get('facility_type') ?? '의원'

  if (years.length === 0) return NextResponse.json([])

  const yearGroups = expandYearGroups(years)

  let query = supabase
    .from('mogaha_registry')
    .select('mogaha_id, license_date, name, address, region1, region2, specialty, staff_count, area_pyeong, lat, lng, is_closed, closed_date, is_transfer, transfer_date, year_group')
    .in('year_group', yearGroups)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('facility_type', facilityType)

  if (specialty) query = query.eq('specialty', specialty)

  // 개원/폐원 모드 분기
  if (mapMode === 'open')   query = query.eq('is_closed', false)
  if (mapMode === 'closed') query = query.eq('is_closed', true)
  // 'all' 이면 필터 없음

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
