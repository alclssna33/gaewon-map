import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fromDate     = searchParams.get('from_date')
  const toDate       = searchParams.get('to_date')
  const specialty    = searchParams.get('specialty') ?? ''
  const mapMode      = searchParams.get('map_mode') ?? 'open'  // open | closed | all
  const facilityType = searchParams.get('facility_type') ?? '의원'

  if (!fromDate || !toDate) return NextResponse.json([])

  // 개원 표: license_date 기준 / 폐원 표: closed_date 기준
  const dateCol = mapMode === 'closed' ? 'closed_date' : 'license_date'

  let query = supabase
    .from('mogaha_registry')
    .select('mogaha_id, name, address, region1, region2, specialty, license_date, closed_date, staff_count, area_pyeong, is_transfer, transfer_date')
    .gte(dateCol, fromDate)
    .lte(dateCol, toDate)
    .eq('facility_type', facilityType)
    .order('address', { ascending: true })

  if (specialty) query = query.eq('specialty', specialty)
  if (mapMode === 'open')   query = query.eq('is_closed', false)
  if (mapMode === 'closed') query = query.eq('is_closed', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
