import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
