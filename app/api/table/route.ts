import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period  = searchParams.get('period') ?? 'week'   // week | month
  const specialty = searchParams.get('specialty') ?? ''  // 빈값 = 전체

  const days = period === 'month' ? 30 : 7
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const fromStr = fromDate.toISOString().slice(0, 10)   // YYYY-MM-DD

  let query = supabase
    .from('clinics')
    .select('id, name, address, specialty, license_date, staff_count, area_pyeong')
    .gte('license_date', fromStr)
    .eq('is_closed', false)
    .not('lat', 'is', null)
    .order('license_date', { ascending: false })
    .limit(500)

  if (specialty) {
    query = query.eq('specialty', specialty)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
