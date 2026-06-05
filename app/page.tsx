'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import type { Clinic } from '@/lib/supabase'

const Map = dynamic(() => import('./components/Map'), { ssr: false })

const YEARS = ['-09', '10-19', '2020', '2021', '2022', '2023', '2024', '2025', '26.1']
const YEAR_LABELS: Record<string, string> = {
  '-09': '2009이전', '10-19': '10~19', '2020': '2020', '2021': '2021',
  '2022': '2022', '2023': '2023', '2024': '2024', '2025': '2025', '26.1': '26.1',
}

type ViewMode = 'default' | 'size' | 'staff'

export default function Home() {
  const [selectedYears, setSelectedYears] = useState<string[]>(['2025'])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('default')
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(false)
  const [headerOpen, setHeaderOpen] = useState(true)

  useEffect(() => {
    if (selectedYears.length === 0) { setSpecialties([]); return }
    const params = selectedYears.map(y => `year=${encodeURIComponent(y)}`).join('&')
    fetch(`/api/specialties?${params}`)
      .then(r => r.json())
      .then(data => {
        setSpecialties(data)
        setSelectedSpecialty(data[0] ?? '')
      })
  }, [selectedYears])

  const toggleYear = (y: string) => {
    setSelectedYears(prev =>
      prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y]
    )
  }

  const loadMap = useCallback(async () => {
    if (selectedYears.length === 0 || !selectedSpecialty) return
    setLoading(true)
    const params = [
      ...selectedYears.map(y => `year=${encodeURIComponent(y)}`),
      `specialty=${encodeURIComponent(selectedSpecialty)}`,
    ].join('&')
    const data = await fetch(`/api/clinics?${params}`).then(r => r.json())
    setClinics(data)
    setLoading(false)
  }, [selectedYears, selectedSpecialty])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Malgun Gothic', sans-serif", overflow: 'hidden' }}>

      {headerOpen && (
        <div style={{ background: '#2c3e50', color: 'white', padding: '12px 16px', zIndex: 1001, position: 'relative' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, background: 'rgba(255,255,255,0.1)', padding: '8px 10px', borderRadius: 8 }}>
            {YEARS.map(y => (
              <label key={y} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                <input type="checkbox" checked={selectedYears.includes(y)} onChange={() => toggleYear(y)} style={{ width: 15, height: 15 }} />
                {YEAR_LABELS[y]}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select value={selectedSpecialty} onChange={e => setSelectedSpecialty(e.target.value)}
              style={{ flex: 1, fontSize: 16, padding: '10px', borderRadius: 8, border: 'none', outline: 'none' }}>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', background: '#34495e', padding: '8px', borderRadius: 8, marginBottom: 8, fontSize: 14 }}>
            {(['default', 'size', 'staff'] as ViewMode[]).map(m => (
              <label key={m} style={{ cursor: 'pointer' }}>
                <input type="radio" name="viewMode" value={m} checked={viewMode === m} onChange={() => setViewMode(m)} />
                &nbsp;{m === 'default' ? '기본' : m === 'size' ? '규모별' : '인원별'}
              </label>
            ))}
          </div>

          <button onClick={loadMap} disabled={loading}
            style={{ width: '100%', background: '#3498db', color: 'white', fontSize: 17, fontWeight: 'bold', padding: '11px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
            {loading ? '로딩 중...' : '데이터 조회하기'}
          </button>

          <button onClick={() => setHeaderOpen(false)}
            style={{ position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)', background: '#2c3e50', color: 'white', border: 'none', padding: '4px 20px', borderRadius: '0 0 10px 10px', cursor: 'pointer', fontSize: 13, zIndex: 1002 }}>
            ▲ 접기
          </button>
        </div>
      )}

      {!headerOpen && (
        <>
          <button onClick={() => setHeaderOpen(true)}
            style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', background: '#2c3e50', color: 'white', border: 'none', padding: '6px 22px', borderRadius: '0 0 10px 10px', cursor: 'pointer', fontSize: 13, zIndex: 1002 }}>
            ▼ 펼치기
          </button>
          <a href="https://cafe.naver.com/anesinformation" target="_blank" rel="noreferrer"
            style={{ position: 'fixed', top: 16, right: 16, zIndex: 1005, background: '#27ae60', color: 'white', padding: '10px 18px', borderRadius: 8, fontWeight: 'bold', fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            개원비밀공간 바로가기 ↗
          </a>
        </>
      )}

      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <div style={{ width: 48, height: 48, border: '5px solid #f3f3f3', borderTop: '5px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>데이터 로딩 중...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        <Map clinics={clinics} viewMode={viewMode} />
      </div>
    </div>
  )
}
