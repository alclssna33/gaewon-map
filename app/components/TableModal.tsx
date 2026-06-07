'use client'

import { useState, useEffect, useCallback } from 'react'

type Row = {
  mogaha_id: string
  name: string
  address: string | null
  specialty: string | null
  license_date: string | null
  closed_date: string | null
  staff_count: number | null
  area_pyeong: number | null
  is_transfer: boolean | null
  transfer_date: string | null
}
type SortKey = 'address' | 'license_date' | 'closed_date' | 'name' | 'staff_count' | 'area_pyeong'
type Mode    = 'week' | 'month'
type MapMode = 'open' | 'closed' | 'all'

// ── 과목별 고정 색상 ──────────────────────────────────────────────────
const SPECIALTY_COLORS: Record<string, string> = {
  '통증관련':    '#e74c3c',
  '내과':        '#3498db',
  '피부과':      '#2ecc71',
  '이비인후과':  '#f39c12',
  '소아청소년과':'#9b59b6',
  '가정의학과':  '#1abc9c',
  '안과':        '#e67e22',
  '산부인과':    '#e91e8c',
  '성형외과':    '#00bcd4',
  '정신과':      '#607d8b',
  '비뇨기과':    '#8bc34a',
  '일반의':      '#bdc3c7',
  '병원':        '#795548',
  '외과':        '#ff5722',
}
const FALLBACK_COLORS = ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6',
  '#1abc9c','#e67e22','#e91e8c','#00bcd4','#607d8b','#8bc34a','#bdc3c7']

function getColor(specialty: string, idx: number) {
  return SPECIALTY_COLORS[specialty] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

// ── SVG 파이차트 ──────────────────────────────────────────────────────
function PieChart({ data, title }: { data: { label: string; count: number }[]; title: string }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>데이터가 없습니다.</div>

  const cx = 200, cy = 200, r = 130

  // 100% 단일 과목일 때 → 원 그리기 (SVG arc는 시작=끝이면 렌더 안 됨)
  if (data.length === 1) {
    const d = data[0]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <svg width={520} height={420} viewBox="0 0 520 420" style={{ maxWidth: '100%' }}>
          <circle cx={cx} cy={cy} r={r} fill={getColor(d.label, 0)} stroke="white" strokeWidth={2} opacity={0.92} />
          <text x={cx} y={cy - 12} textAnchor="middle" fontSize={18} fontWeight="bold" fill="white">{d.label}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={14} fill="white">100% · {d.count}건</text>
          <text x={cx} y={cy + 34} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.8)">{title}</text>
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: getColor(d.label, 0) }} />
          <span>{d.label}</span>
          <span style={{ color: '#888', fontWeight: 'bold' }}>{d.count}건 (100%)</span>
        </div>
      </div>
    )
  }

  let angle = -Math.PI / 2
  const slices = data.map((d, i) => {
    const ratio = d.count / total
    const startAngle = angle
    const endAngle   = angle + ratio * 2 * Math.PI
    angle = endAngle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const large = ratio > 0.5 ? 1 : 0

    const midAngle = startAngle + (endAngle - startAngle) / 2
    const labelR = r * 0.62
    const lx = cx + labelR * Math.cos(midAngle)
    const ly = cy + labelR * Math.sin(midAngle)

    const outerR = r + 30
    const ox     = cx + outerR * Math.cos(midAngle)
    const oy     = cy + outerR * Math.sin(midAngle)
    const lineR  = r + 8
    const linex  = cx + lineR * Math.cos(midAngle)
    const liney  = cy + lineR * Math.sin(midAngle)

    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
      lx, ly, ox, oy, linex, liney, midAngle, ratio,
      color: getColor(d.label, i), label: d.label, count: d.count,
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg width={520} height={420} viewBox="0 0 520 420" style={{ maxWidth: '100%' }}>
        {/* 중앙 텍스트 */}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={15} fontWeight="bold" fill="#2c3e50">{title}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={13} fill="#888">개원비밀공간</text>

        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.d} fill={s.color} stroke="white" strokeWidth={2} opacity={0.92} />
            {s.ratio >= 0.05 && (
              <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle"
                fontSize={13} fontWeight="bold" fill="white">{s.count}</text>
            )}
            {s.ratio >= 0.04 && (
              <>
                <line x1={s.linex} y1={s.liney} x2={s.ox} y2={s.oy} stroke={s.color} strokeWidth={1.5} />
                <text x={s.ox + (Math.cos(s.midAngle) > 0 ? 4 : -4)} y={s.oy - 6}
                  textAnchor={Math.cos(s.midAngle) > 0 ? 'start' : 'end'} fontSize={11} fill="#333">
                  {s.label}
                </text>
                <text x={s.ox + (Math.cos(s.midAngle) > 0 ? 4 : -4)} y={s.oy + 7}
                  textAnchor={Math.cos(s.midAngle) > 0 ? 'start' : 'end'} fontSize={10} fill="#888">
                  {(s.ratio * 100).toFixed(1)}%
                </text>
              </>
            )}
          </g>
        ))}
      </svg>

      {/* 범례 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center', maxWidth: 480, paddingBottom: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: getColor(d.label, i), flexShrink: 0 }} />
            <span style={{ color: '#555' }}>{d.label}</span>
            <span style={{ color: '#888', fontWeight: 'bold' }}>{d.count}건</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 날짜 유틸 ─────────────────────────────────────────────────────────
const NOW = new Date()
const CUR_YEAR  = NOW.getFullYear()
const CUR_MONTH = NOW.getMonth() + 1
const YEARS  = [2024, 2025, 2026, 2027].filter(y => y <= CUR_YEAR)
const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12]

function lastDayOf(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}
function getWeekRange(year: number, month: number, week: number) {
  const start = (week - 1) * 7 + 1
  const end   = week === 5 ? lastDayOf(year, month) : Math.min(week * 7, lastDayOf(year, month))
  const pad   = (n: number) => String(n).padStart(2, '0')
  return { from: `${year}-${pad(month)}-${pad(start)}`, to: `${year}-${pad(month)}-${pad(end)}` }
}
function getMonthRange(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDayOf(year, month))}` }
}
function weeksInMonth(year: number, month: number) {
  return lastDayOf(year, month) >= 29 ? 5 : 4
}

// ── Props ─────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void
  specialties: string[]
  mapMode: MapMode   // 지도 현재 모드 (초기값으로만 사용)
}

export default function TableModal({ onClose, specialties, mapMode }: Props) {
  // 표 모달은 지도 모드와 독립적으로 개원/폐원 전환 가능
  const [tableMode,  setTableMode]  = useState<'open' | 'closed'>(mapMode === 'closed' ? 'closed' : 'open')
  const [mode,       setMode]       = useState<Mode>('month')
  const [selYear,    setSelYear]    = useState(CUR_YEAR)
  const [selMonth,   setSelMonth]   = useState(CUR_MONTH)
  const [selWeek,    setSelWeek]    = useState(1)
  const [specialty,  setSpecialty]  = useState('')
  const [rows,       setRows]       = useState<Row[]>([])
  const [loading,    setLoading]    = useState(false)
  const [sortKey,    setSortKey]    = useState<SortKey>('address')
  const [sortAsc,    setSortAsc]    = useState(true)
  const [showChart,  setShowChart]  = useState(false)

  const dateRange = useCallback(() =>
    mode === 'month'
      ? getMonthRange(selYear, selMonth)
      : getWeekRange(selYear, selMonth, selWeek),
    [mode, selYear, selMonth, selWeek]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { from, to } = dateRange()
    const params = new URLSearchParams({
      from_date: from, to_date: to,
      map_mode: tableMode,
      facility_type: '의원',
    })
    if (specialty) params.set('specialty', specialty)
    const data = await fetch(`/api/mr/table?${params}`).then(r => r.json())
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [dateRange, specialty, tableMode])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const max = weeksInMonth(selYear, selMonth)
    if (selWeek > max) setSelWeek(max)
  }, [selYear, selMonth, selWeek])

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    return (sortAsc ? 1 : -1) * String(av).localeCompare(String(bv), 'ko')
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
    background: tableMode === 'closed' ? '#c0392b' : '#f5c518',
    color: tableMode === 'closed' ? 'white' : '#333',
    padding: '8px 10px', fontSize: 13, fontWeight: 'bold',
    textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap',
    borderRight: tableMode === 'closed' ? '1px solid #a93226' : '1px solid #e0b800',
    position: 'sticky', top: 0,
  }
  const tdStyle: React.CSSProperties = {
    padding: '7px 10px', fontSize: 13, borderBottom: '1px solid #f0f0f0',
    borderRight: '1px solid #f0f0f0', verticalAlign: 'middle',
  }

  // 파이차트용 과목별 집계
  const chartData = (() => {
    const m: Record<string, number> = {}
    rows.forEach(r => { const s = r.specialty ?? '기타'; m[s] = (m[s] ?? 0) + 1 })
    return Object.entries(m).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
  })()
  const chartTitle = mode === 'month'
    ? `${selMonth}월 ${tableMode === 'closed' ? '폐원' : '개원'}현황`
    : `${selMonth}월 ${selWeek}주 ${tableMode === 'closed' ? '폐원' : '개원'}현황`

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 30 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{ background: 'white', width: '96%', maxWidth: 1200, borderRadius: 10,
          boxShadow: '0 6px 24px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>

        {/* ── 헤더 ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 20px', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }}>📊 개원현황 목록</div>
            <button onClick={() => setShowChart(true)}
              style={{ padding: '5px 14px', fontSize: 13, borderRadius: 6,
                border: '1px solid #9b59b6', background: '#9b59b6',
                color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
              🥧 그래프
            </button>
          </div>
          <button onClick={onClose}
            style={{ fontSize: 24, color: '#999', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* ── 개원 / 폐원 탭 ── */}
        <div style={{ display: 'flex', borderBottom: '2px solid #eee' }}>
          {([['open', '🟢 개원'], ['closed', '🔴 폐원']] as const).map(([m, label]) => (
            <button key={m} onClick={() => { setTableMode(m); setSortKey('address'); setSortAsc(true) }}
              style={{
                flex: 1, padding: '11px 0', fontSize: 16, fontWeight: 'bold',
                border: 'none', cursor: 'pointer',
                background: tableMode === m
                  ? (m === 'closed' ? '#c0392b' : '#1a5276')
                  : '#f8f9fa',
                color: tableMode === m ? 'white' : '#888',
                borderBottom: tableMode === m ? '3px solid transparent' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── 파이차트 팝업 ── */}
        {showChart && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 4000,
              display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={e => { if (e.target === e.currentTarget) setShowChart(false) }}>
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                maxWidth: 580, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 20px', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#2c3e50' }}>
                  🥧 과목별 {tableMode === 'closed' ? '폐원' : '개원'} 현황
                </div>
                <button onClick={() => setShowChart(false)}
                  style={{ fontSize: 24, color: '#999', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: '16px 12px' }}>
                <PieChart data={chartData} title={chartTitle} />
              </div>
            </div>
          </div>
        )}

        {/* ── 필터 바 ── */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* 월간/주간 */}
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
            {/* 주 */}
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
              const val    = s === '전체' ? '' : s
              const active = specialty === val
              return (
                <button key={s} onClick={() => setSpecialty(val)}
                  style={{ padding: '5px 14px', fontSize: 13, borderRadius: 20,
                    border: `1px solid ${tableMode === 'closed' ? '#c0392b' : '#2c3e50'}`,
                    cursor: 'pointer', fontWeight: active ? 'bold' : 'normal',
                    background: active ? (tableMode === 'closed' ? '#c0392b' : '#2c3e50') : 'white',
                    color: active ? 'white' : (tableMode === 'closed' ? '#c0392b' : '#2c3e50') }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 테이블 ── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 200 }} />
              <col />
              {specialty === '' && <col style={{ width: 90 }} />}
              <col style={{ width: 100 }} />
              {tableMode === 'closed' && <col style={{ width: 100 }} />}
              <col style={{ width: 72 }} />
              <col style={{ width: 60 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thStyle, cursor: 'default' }}>번호</th>
                <th style={thStyle} onClick={() => toggleSort('name')}>사업장명{arrow('name')}</th>
                <th style={thStyle} onClick={() => toggleSort('address')}>도로명주소{arrow('address')}</th>
                {specialty === '' && <th style={thStyle}>과목</th>}
                <th style={{ ...thStyle, whiteSpace: 'nowrap' }} onClick={() => toggleSort('license_date')}>개원일{arrow('license_date')}</th>
                {tableMode === 'closed' && (
                  <th style={{ ...thStyle, whiteSpace: 'nowrap' }} onClick={() => toggleSort('closed_date')}>
                    폐업일{arrow('closed_date')}
                  </th>
                )}
                <th style={thStyle} onClick={() => toggleSort('staff_count')}>의료인수{arrow('staff_count')}</th>
                <th style={thStyle} onClick={() => toggleSort('area_pyeong')}>평수{arrow('area_pyeong')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    해당 기간에 {tableMode === 'closed' ? '폐원' : '개원'} 데이터가 없습니다.
                  </td>
                </tr>
              )}
              {sorted.map((row, i) => (
                <tr key={row.mogaha_id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#888' }}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold',
                    color: tableMode === 'closed' ? '#7f8c8d' : '#2c3e50' }}>
                    {row.name}
                    {row.is_transfer && (
                      <span title={`양수양도 추정 (이전 폐업일: ${row.transfer_date ?? '-'})`}
                        style={{ marginLeft: 6, display: 'inline-block', background: '#f39c12',
                          color: 'white', fontSize: 10, fontWeight: 'bold', padding: '1px 5px',
                          borderRadius: 3, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        🔄 양수양도
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#555' }}>{row.address ?? '-'}</td>
                  {specialty === '' && (
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 12 }}>{row.specialty ?? '-'}</td>
                  )}
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{row.license_date ?? '-'}</td>
                  {tableMode === 'closed' && (
                    <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap',
                      color: '#c0392b', fontWeight: 'bold' }}>{row.closed_date ?? '-'}</td>
                  )}
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#8e44ad', fontWeight: 'bold' }}>
                    {row.staff_count ?? '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {row.area_pyeong ? Math.round(row.area_pyeong) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
