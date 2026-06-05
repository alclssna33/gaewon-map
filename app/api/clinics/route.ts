import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years = searchParams.getAll('year')
  const specialty = searchParams.get('specialty')

  if (!specialty || years.length === 0) {
    return NextResponse.json([], { status: 200 })
  }

  const { data, error } = await supabase
    .from('clinics')
    .select('id, license_date, name, address, staff_count, area_pyeong, lat, lng')
    .in('year_group', years)
    .eq('specialty', specialty)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
