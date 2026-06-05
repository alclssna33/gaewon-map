import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fromDate  = searchParams.get('from_date')   // YYYY-MM-DD
  const toDate    = searchParams.get('to_date')     // YYYY-MM-DD
  const specialty = searchParams.get('specialty') ?? ''

  if (!fromDate || !toDate) {
    return NextResponse.json({ error: 'from_date and to_date required' }, { status: 400 })
  }

  let query = supabase
    .from('clinics')
    .select('id, name, address, specialty, license_date, staff_count, area_pyeong')
    .gte('license_date', fromDate)
    .lte('license_date', toDate)
    .neq('is_closed', true)
    .not('lat', 'is', null)
    .order('license_date', { ascending: false })
    .limit(1000)

  if (specialty) query = query.eq('specialty', specialty)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
