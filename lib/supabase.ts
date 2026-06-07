import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 기존 clinics 테이블 타입 (레거시)
export type Clinic = {
  id: number
  license_date: string | null
  name: string
  address: string | null
  specialty: string | null
  year_group: string | null
  staff_count: number | null
  area_pyeong: number | null
  lat: number
  lng: number
  is_closed: boolean | null
  closed_date: string | null
  is_transfer: boolean | null
  transfer_date: string | null
}

// mogaha_registry 테이블 타입 (행안부 API 전체 125k건)
export type MogahaClinic = {
  mogaha_id: string
  license_date: string | null
  name: string
  address: string | null
  region1: string | null
  region2: string | null
  facility_type: string | null
  specialty: string | null
  staff_count: number | null
  area_pyeong: number | null
  lat: number
  lng: number
  is_closed: boolean
  closed_date: string | null
  is_transfer: boolean
  transfer_date: string | null
  year_group: string | null
}
