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

  // 연도와 무관하게 항상 고정 순서로 전체 과목 반환
  // (연도별로 데이터 유무에 따라 목록이 줄어드는 문제 방지)
  return NextResponse.json(SPECIALTY_ORDER)
}
