import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SPECIALTY_ORDER = [
  '통증관련', '가정의학과', '내과', '비뇨기과', '산부인과',
  '성형외과', '소아청소년과', '안과', '이비인후과', '정신과',
  '피부과', '일반의', '병원',
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years = searchParams.getAll('year')

  if (years.length === 0) return NextResponse.json([])

  const { data, error } = await supabase
    .from('clinics')
    .select('specialty')
    .in('year_group', years)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const found = [...new Set(data.map((r: { specialty: string }) => r.specialty).filter(Boolean))]
  const sorted = SPECIALTY_ORDER.filter(s => found.includes(s))
  return NextResponse.json(sorted)
}
