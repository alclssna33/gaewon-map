import { NextResponse } from 'next/server'

// 의원 과목 고정 순서 (연도·데이터 유무와 무관하게 항상 동일)
const CLINIC_SPECIALTIES = [
  '통증관련', '가정의학과', '내과', '비뇨기과', '산부인과',
  '성형외과', '소아청소년과', '안과', '이비인후과', '정신과',
  '피부과', '일반의', '병원',
]

export async function GET() {
  return NextResponse.json(CLINIC_SPECIALTIES)
}
