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
      // 연도 전체(예: "2026") → 해당 연도 월별 그룹 전체
      const short = y.slice(2)  // "2026" → "26"
      for (let m = 1; m <= 12; m++) result.push(`${short}.${m}`)
    } else {
      result.push(y)
    }
  }
  return result
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years = searchParams.getAll('year')
  const specialty = searchParams.get('specialty')
  const includeClosed = searchParams.get('include_closed') === 'true'

  if (years.length === 0) {
    return NextResponse.json([], { status: 200 })
  }

  const yearGroups = expandYearGroups(years)

  let query = supabase
    .from('clinics')
    .select('id, license_date, name, address, staff_count, area_pyeong, lat, lng, is_closed, closed_date, is_transfer, transfer_date')
    .in('year_group', yearGroups)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (specialty) {
    query = query.eq('specialty', specialty)
  }

  if (!includeClosed) {
    query = query.neq('is_closed', true)  // 기본: 폐업 제외
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
