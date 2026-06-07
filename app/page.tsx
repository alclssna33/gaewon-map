'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { MogahaClinic } from '@/lib/supabase'
import type { MapHandle } from './components/Map'
import TableModal from './components/TableModal'

const Map = dynamic(() => import('./components/Map'), { ssr: false })

// 연도/월 그룹 자동 생성
const NOW = new Date()
const CURRENT_YEAR  = NOW.getFullYear()
const CURRENT_MONTH = NOW.getMonth() + 1
const CURRENT_YEAR_SHORT = String(CURRENT_YEAR).slice(2)
const CURRENT_MONTHS = Array.from({ length: CURRENT_MONTH }, (_, i) => `${CURRENT_YEAR_SHORT}.${i + 1}`)

const YEARS = ['-09', '10-19', '2020', '2021', '2022', '2023', '2024', '2025', ...CURRENT_MONTHS]
const YEAR_LABELS: Record<string, string> = {
  '-09': '2009이전', '10-19': '10~19',
  '2020': '2020', '2021': '2021', '2022': '2022', '2023': '2023', '2024': '2024', '2025': '2025',
  ...Object.fromEntries(CURRENT_MONTHS.map(m => [m, m])),
}

type ViewMode = 'default' | 'size' | 'staff'
type MapMode  = 'open' | 'closed' | 'all'
type AnalysisResult = MogahaClinic & { distanceM: number }

function calcDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const MAP_MODE_LABELS: Record<MapMode, string> = {
  open:   '🟢 개원 (영업중)',
  closed: '🔴 폐원',
  all:    '⚪ 전체',
}

export default function Home() {
  const mapRef = useRef<MapHandle>(null)

  const [selectedYears,    setSelectedYears]    = useState<string[]>(['2025'])
  const [specialties,      setSpecialties]      = useState<string[]>([])
  const [selectedSpecialty,setSelectedSpecialty] = useState('')
  const [mapMode,          setMapMode]          = useState<MapMode>('open')
  const [viewMode,         setViewMode]         = useState<ViewMode>('default')
  const [clinics,          setClinics]          = useState<MogahaClinic[]>([])
  const [loading,          setLoading]          = useState(false)
  const [headerOpen,       setHeaderOpen]       = useState(true)
  const [tableOpen,        setTableOpen]        = useState(false)

  const [modalOpen,        setModalOpen]        = useState(false)
  const [addressInput,     setAddressInput]     = useState('')
  const [radiusKm,         setRadiusKm]         = useState(1.0)
  const [analysisResults,  setAnalysisResults]  = useState<AnalysisResult[] | null>(null)
  const [geocoding,        setGeocoding]        = useState(false)
  const [geocodeError,     setGeocodeError]     = useState('')

  // 과목 목록 로드 (고정 목록)
  useEffect(() => {
    if (selectedYears.length === 0) { setSpecialties([]); return }
    fetch('/api/mr/specialties')
      .then(r => r.json())
      .then(data => setSpecialties(data))
  }, [selectedYears])

  const toggleYear = (y: string) =>
    setSelectedYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y])

  const loadMap = useCallback(async () => {
    if (selectedYears.length === 0) return
    setLoading(true)

    // 폐원 모드: 폐업일 기준 year_group이 아닌 개원일 year_group 기준으로 연도 필터
    // → 실제로는 연도 선택 없이 license_date year_group 기준 적용
    const params = [
      ...selectedYears.map(y => `year=${encodeURIComponent(y)}`),
      `map_mode=${mapMode}`,
      `facility_type=의원`,
    ]
    if (selectedSpecialty) params.push(`specialty=${encodeURIComponent(selectedSpecialty)}`)
    const data = await fetch(`/api/mr/map-clinics?${params.join('&')}`).then(r => r.json())
    setClinics(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [selectedYears, selectedSpecialty, mapMode])

  const runAnalysis = async () => {
    if (!addressInput.trim()) return
    if (clinics.length === 0) { setGeocodeError('먼저 지도 데이터를 조회해주세요.'); return }
    setGeocoding(true); setGeocodeError(''); setAnalysisResults(null)

    const res = await fetch(`/api/geocode?address=${encodeURIComponent(addressInput)}`)
    const loc = await res.json()
    if (!loc) {
      setGeocodeError('주소를 찾을 수 없습니다. 더 구체적으로 입력해보세요.')
      setGeocoding(false); return
    }
    mapRef.current?.setSearchPin(loc.lat, loc.lng)
    const results: AnalysisResult[] = clinics
      .map(c => ({ ...c, distanceM: calcDistanceM(loc.lat, loc.lng, c.lat, c.lng) }))
      .filter(c => c.distanceM <= radiusKm * 1000)
      .sort((a, b) => a.distanceM - b.distanceM)
    setAnalysisResults(results)
    setGeocoding(false)
  }

  const handleResultClick = (c: AnalysisResult) => {
    setModalOpen(false)
    mapRef.current?.flyToClinic(c.lat, c.lng)
  }
  const distText = (m: number) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`

  // 모드별 헤더 배경색
  const headerBg = mapMode === 'closed' ? '#6b2737' : mapMode === 'all' ? '#2c3e50' : '#1a5276'

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: "'Malgun Gothic', sans-serif", overflow: 'hidden' }}>

      {headerOpen && (
        <div style={{ background: headerBg, color: 'white', padding: '12px 16px', zIndex: 1001, position: 'relative', transition: 'background 0.3s' }}>

          {/* 연도 선택 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, background: 'rgba(255,255,255,0.1)', padding: '8px 10px', borderRadius: 8 }}>
            {YEARS.map(y => (
              <label key={y} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                <input type="checkbox" checked={selectedYears.includes(y)} onChange={() => toggleYear(y)} style={{ width: 15, height: 15 }} />
                {YEAR_LABELS[y]}
              </label>
            ))}
          </div>

          {/* 개원 / 폐원 / 전체 토글 */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.4)' }}>
            {(['open', 'closed', 'all'] as MapMode[]).map(m => (
              <button key={m} onClick={() => setMapMode(m)}
                style={{
                  flex: 1, padding: '9px 0', fontSize: 15, fontWeight: 'bold', border: 'none', cursor: 'pointer',
                  background: mapMode === m
                    ? (m === 'open' ? '#2980b9' : m === 'closed' ? '#c0392b' : '#7f8c8d')
                    : 'rgba(255,255,255,0.15)',
                  color: 'white',
                  transition: 'background 0.2s',
                }}>
                {MAP_MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* 과목 선택 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select value={selectedSpecialty} onChange={e => setSelectedSpecialty(e.target.value)}
              style={{ flex: 1, fontSize: 16, padding: '10px', borderRadius: 8, border: 'none', outline: 'none' }}>
              <option value="">전체 과목</option>
              <option disabled>──────────────</option>
              {specialties.map(s => (
                <option key={s} value={s}>
                  {s === '통증관련' ? '통증관련 (정형/통증/재활)' : s}
                </option>
              ))}
            </select>
          </div>

          {/* 마커 색상 모드 (개원 모드에서만 의미 있음) */}
          {mapMode !== 'closed' && (
            <div style={{ display: 'flex', justifyContent: 'space-around', background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: 8, marginBottom: 8, fontSize: 14 }}>
              {(['default', 'size', 'staff'] as ViewMode[]).map(m => (
                <label key={m} style={{ cursor: 'pointer' }}>
                  <input type="radio" name="viewMode" value={m} checked={viewMode === m} onChange={() => setViewMode(m)} />
                  &nbsp;{m === 'default' ? '기본' : m === 'size' ? '규모별' : '인원별'}
                </label>
              ))}
            </div>
          )}

          {/* 조회 버튼 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadMap} disabled={loading}
              style={{ flex: 1, background: '#3498db', color: 'white', fontSize: 17, fontWeight: 'bold', padding: '11px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
              {loading ? '로딩 중...' : `데이터 조회하기 (${clinics.length > 0 ? clinics.length + '건 표시 중' : ''})`}
            </button>
            <button onClick={() => setTableOpen(true)}
              style={{ background: '#8e44ad', color: 'white', fontSize: 15, fontWeight: 'bold', padding: '11px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📊 표로 보기
            </button>
          </div>

          <button onClick={() => setHeaderOpen(false)}
            style={{ position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)', background: headerBg, color: 'white', border: 'none', padding: '4px 20px', borderRadius: '0 0 10px 10px', cursor: 'pointer', fontSize: 13, zIndex: 1002 }}>
            ▲ 접기
          </button>
        </div>
      )}

      {!headerOpen && (
        <>
          <button onClick={() => setHeaderOpen(true)}
            style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', background: headerBg, color: 'white', border: 'none', padding: '6px 22px', borderRadius: '0 0 10px 10px', cursor: 'pointer', fontSize: 13, zIndex: 1002 }}>
            ▼ 펼치기 ({MAP_MODE_LABELS[mapMode]}{clinics.length > 0 ? ` · ${clinics.length}건` : ''})
          </button>
          <button onClick={() => setTableOpen(true)}
            style={{ position: 'fixed', top: 16, right: 470, zIndex: 1005, background: '#8e44ad', color: 'white', padding: '10px 18px', borderRadius: 8, fontWeight: 'bold', fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            📊 표로 보기
          </button>
          <button onClick={() => { setModalOpen(true); setAnalysisResults(null); setGeocodeError('') }}
            style={{ position: 'fixed', top: 16, right: 240, zIndex: 1005, background: '#e67e22', color: 'white', padding: '10px 18px', borderRadius: 8, fontWeight: 'bold', fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            🔍 주소 분석
          </button>
          <a href="https://cafe.naver.com/anesinformation" target="_blank" rel="noreferrer"
            style={{ position: 'fixed', top: 16, right: 16, zIndex: 1005, background: '#27ae60', color: 'white', padding: '10px 18px', borderRadius: 8, fontWeight: 'bold', fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            개원비밀공간 바로가기 ↗
          </a>
        </>
      )}

      {/* 개원현황 테이블 모달 */}
      {tableOpen && (
        <TableModal
          onClose={() => setTableOpen(false)}
          specialties={specialties}
          mapMode={mapMode}
        />
      )}

      {/* 반경 분석 모달 */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div style={{ background: 'white', width: '90%', maxWidth: 500, borderRadius: 10, padding: 20, boxShadow: '0 5px 20px rgba(0,0,0,0.3)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }}>주소 기반 반경 분석</div>
              <button onClick={() => setModalOpen(false)} style={{ fontSize: 24, color: '#999', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <input type="text" value={addressInput} onChange={e => setAddressInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runAnalysis()}
              placeholder="주소 입력 (예: 강남대로 123)"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 5, fontSize: 16, marginBottom: 10, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select value={radiusKm} onChange={e => setRadiusKm(parseFloat(e.target.value))}
                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: 5, fontSize: 15 }}>
                <option value={0.5}>0.5km</option>
                <option value={1.0}>1.0km</option>
                <option value={1.5}>1.5km</option>
                <option value={2.0}>2.0km</option>
              </select>
              <button onClick={runAnalysis} disabled={geocoding}
                style={{ flex: 1, background: '#3498db', color: 'white', border: 'none', borderRadius: 5, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', padding: '10px' }}>
                {geocoding ? '검색 중...' : '분석하기'}
              </button>
            </div>
            {geocodeError && <div style={{ color: '#e74c3c', fontSize: 14, marginBottom: 8 }}>{geocodeError}</div>}
            <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #eee', marginTop: 4 }}>
              {analysisResults === null && !geocoding && (
                <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 14 }}>
                  주소를 입력하고 분석 버튼을 눌러주세요.<br />(현재 지도에 로딩된 데이터 기준)
                </div>
              )}
              {analysisResults !== null && analysisResults.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>반경 내 병원이 없습니다.</div>
              )}
              {analysisResults?.map(c => (
                <div key={c.mogaha_id} onClick={() => handleResultClick(c)}
                  style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: 16 }}>{c.name}</span>
                    <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: 14 }}>{distText(c.distanceM)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#7f8c8d', marginTop: 3 }}>{c.address}</div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 3 }}>
                    {c.is_closed
                      ? `🚫 폐업: ${c.closed_date ?? '-'}`
                      : `📅 ${c.license_date ?? '-'} | 👥 ${c.staff_count ?? '-'}명 | 📐 ${c.area_pyeong ? Math.round(c.area_pyeong) : '-'}평`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <div style={{ width: 48, height: 48, border: '5px solid #f3f3f3', borderTop: '5px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>데이터 로딩 중...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <Map ref={mapRef} clinics={clinics} viewMode={viewMode} mapMode={mapMode} />
      </div>
    </div>
  )
}
