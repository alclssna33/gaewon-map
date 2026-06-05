'use client'

import { useState, useEffect, useCallback } from 'react'

type Row = {
  id: number
  name: string
  address: string | null
  specialty: string | null
  license_date: string | null
  staff_count: number | null
  area_pyeong: number | null
}
type SortKey = 'address' | 'license_date' | 'name' | 'staff_count' | 'area_pyeong'
type Mode = 'week' | 'month'

const NOW = new Date()
const CUR_YEAR  = NOW.getFullYear()
const CUR_MONTH = NOW.getMonth() + 1
const YEARS = [2025, 2026, 2027].filter(y => y <= CUR_YEAR)
const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12]

function lastDayOf(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getWeekRange(year: number, month: number, week: number) {
  const start = (week - 1) * 7 + 1
  const end   = week === 5
    ? lastDayOf(year, month)
    : Math.min(week * 7, lastDayOf(year, month))
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    from: `${year}-${pad(month)}-${pad(start)}`,
    to:   `${year}-${pad(month)}-${pad(end)}`,
  }
}

function getMonthRange(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    from: `${year}-${pad(month)}-01`,
    to:   `${year}-${pad(month)}-${pad(lastDayOf(year, month))}`,
  }
}

// 해당 월의 유효 주 수 (5주 여부)
function weeksInMonth(year: number, month: number) {
  return lastDayOf(year, month) >= 29 ? 5 : 4
}

interface Props {
  onClose: () => void
  specialties: string[]
}

export default function TableModal({ onClose, specialties }: Props) {
  const [mode,      setMode]      = useState<Mode>('month')
  const [selYear,   setSelYear]   = useState(CUR_YEAR)
  const [selMonth,  setSelMonth]  = useState(CUR_MONTH)
  const [selWeek,   setSelWeek]   = useState(1)
  const [specialty, setSpecialty] = useState('')
  const [rows,      setRows]      = useState<Row[]>([])
  const [loading,   setLoading]   = useState(false)
  const [sortKey,   setSortKey]   = useState<SortKey>('address')
  const [sortAsc,   setSortAsc]   = useState(true)

  const dateRange = useCallback(() => {
    return mode === 'month'
      ? getMonthRange(selYear, selMonth)
      : getWeekRange(selYear, selMonth, selWeek)
  }, [mode, selYear, selMonth, selWeek])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { from, to } = dateRange()
    const params = new URLSearchParams({ from_date: from, to_date: to })
    if (specialty) params.set('specialty', specialty)
    const data = await fetch(`/api/table?${params}`).then(r => r.json())
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [dateRange, specialty])

  useEffect(() => { fetchData() }, [fetchData])

  // 주 선택이 유효 범위 초과 시 보정
  useEffect(() => {
    const max = weeksInMonth(selYear, selMonth)
    if (selWeek > max) setSelWeek(max)
  }, [selYear, selMonth, selWeek])

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    const cmp = String(av).localeCompare(String(bv), 'ko')
    return sortAsc ? cmp : -cmp
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(false) }
  }
  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : ' ↕'

  const { from, to } = dateRange()
  const rangeLabel = mode === 'month'
    ? `${selYear}년 ${selMonth}월 (${from} ~ ${to})`
    : `${selYear}년 ${selMonth}월 ${selWeek}주 (${from} ~ ${to})`

  const selStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', fontSize: 14, borderRadius: 6, border: '1px solid #3498db',
    cursor: 'pointer', fontWeight: 'bold',
    background: active ? '#3498db' : 'white',
    color: active ? 'white' : '#3498db',
  })

  const thStyle: React.CSSProperties = {
    background: '#f5c518', padding: '8px 10px', fontSize: 13,
    fontWeight: 'bold', textAlign: 'center', cursor: 'pointer',
    whiteSpace: 'nowrap', borderRight: '1px solid #e0b800', position: 'sticky', top: 0,
  }
  const tdStyle: React.CSSProperties = {
    padding: '7px 10px', fontSize: 13, borderBottom: '1px solid #f0f0f0',
    borderRight: '1px solid #f0f0f0', verticalAlign: 'middle',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 30 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', width: '96%', maxWidth: 1200, borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }}>📊 개원현황 목록</div>
          <button onClick={onClose} style={{ fontSize: 24, color: '#999', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* 필터 바 */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* 주간 / 월간 토글 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #3498db' }}>
              <button style={selStyle(mode === 'month')} onClick={() => setMode('month')}>월간</button>
              <button style={selStyle(mode === 'week')}  onClick={() => setMode('week')}>주간</button>
            </div>

            {/* 연도 */}
            <select value={selYear} onChange={e => setSelYear(+e.target.value)}
              style={{ padding: '5px 10px', fontSize: 14, borderRadius: 6, border: '1px solid #ddd' }}>
              {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>

            {/* 월 */}
            <select value={selMonth} onChange={e => setSelMonth(+e.target.value)}
              style={{ padding: '5px 10px', fontSize: 14, borderRadius: 6, border: '1px solid #ddd' }}>
              {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
            </select>

            {/* 주 (주간 모드일 때만) */}
            {mode === 'week' && (
              <select value={selWeek} onChange={e => setSelWeek(+e.target.value)}
                style={{ padding: '5px 10px', fontSize: 14, borderRadius: 6, border: '1px solid #ddd' }}>
                {Array.from({ length: weeksInMonth(selYear, selMonth) }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>{w}주</option>
                ))}
              </select>
            )}

            <span style={{ fontSize: 13, color: '#888' }}>{rangeLabel}</span>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>
              {loading ? '로딩 중...' : `총 ${sorted.length}건`}
            </span>
          </div>

          {/* 과목 필터 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['전체', ...specialties].map(s => {
              const val = s === '전체' ? '' : s
              const active = specialty === val
              return (
                <button key={s} onClick={() => setSpecialty(val)}
                  style={{ padding: '5px 14px', fontSize: 13, borderRadius: 20, border: '1px solid #2c3e50', cursor: 'pointer', fontWeight: active ? 'bold' : 'normal', background: active ? '#2c3e50' : 'white', color: active ? 'white' : '#2c3e50' }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* 테이블 */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 200 }} />
              <col />
              {specialty === '' && <col style={{ width: 90 }} />}
              <col style={{ width: 100 }} />
              <col style={{ width: 72 }} />
              <col style={{ width: 60 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thStyle, cursor: 'default' }}>번호</th>
                <th style={thStyle} onClick={() => toggleSort('name')}>사업장명{arrow('name')}</th>
                <th style={thStyle} onClick={() => toggleSort('address')}>도로명주소{arrow('address')}</th>
                {specialty === '' && <th style={thStyle}>과목</th>}
                <th style={{ ...thStyle, whiteSpace: 'nowrap' }} onClick={() => toggleSort('license_date')}>인허가일자{arrow('license_date')}</th>
                <th style={thStyle} onClick={() => toggleSort('staff_count')}>의료인수{arrow('staff_count')}</th>
                <th style={thStyle} onClick={() => toggleSort('area_pyeong')}>평수{arrow('area_pyeong')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#999' }}>해당 기간에 데이터가 없습니다.</td></tr>
              )}
              {sorted.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#888' }}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#2c3e50' }}>{row.name}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#555' }}>{row.address ?? '-'}</td>
                  {specialty === '' && <td style={{ ...tdStyle, textAlign: 'center', fontSize: 12 }}>{row.specialty ?? '-'}</td>}
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{row.license_date ?? '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#8e44ad', fontWeight: 'bold' }}>{row.staff_count ?? '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{row.area_pyeong ? Math.round(row.area_pyeong) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
