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

type SortKey = 'license_date' | 'name' | 'staff_count' | 'area_pyeong'

interface Props {
  onClose: () => void
  specialties: string[]          // 현재 사용 가능한 과목 목록
  defaultSpecialty: string       // 현재 선택된 과목
}

export default function TableModal({ onClose, specialties, defaultSpecialty }: Props) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [specialty, setSpecialty] = useState('')   // '' = 전체
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('license_date')
  const [sortAsc, setSortAsc] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ period })
    if (specialty) params.set('specialty', specialty)
    const data = await fetch(`/api/table?${params}`).then(r => r.json())
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [period, specialty])

  useEffect(() => { fetchData() }, [fetchData])

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

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : ' ↕'

  const thStyle: React.CSSProperties = {
    background: '#f5c518', padding: '8px 10px', fontSize: 13,
    fontWeight: 'bold', textAlign: 'center', cursor: 'pointer',
    whiteSpace: 'nowrap', borderRight: '1px solid #ddd',
  }
  const tdStyle: React.CSSProperties = {
    padding: '7px 10px', fontSize: 13, borderBottom: '1px solid #f0f0f0',
    borderRight: '1px solid #f0f0f0', verticalAlign: 'middle',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 40 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', width: '95%', maxWidth: 900, borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>

        {/* 모달 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }}>📊 개원현황 목록</div>
          <button onClick={onClose} style={{ fontSize: 24, color: '#999', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* 필터 바 */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 18px', borderBottom: '1px solid #eee', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 기간 토글 */}
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #3498db' }}>
            {(['week', 'month'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: '6px 16px', fontSize: 14, fontWeight: 'bold', border: 'none', cursor: 'pointer', background: period === p ? '#3498db' : 'white', color: period === p ? 'white' : '#3498db' }}>
                {p === 'week' ? '주간' : '월간'}
              </button>
            ))}
          </div>

          {/* 과목 토글 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setSpecialty('')}
              style={{ padding: '6px 14px', fontSize: 13, borderRadius: 20, border: '1px solid #2c3e50', cursor: 'pointer', fontWeight: 'bold', background: specialty === '' ? '#2c3e50' : 'white', color: specialty === '' ? 'white' : '#2c3e50' }}>
              전체
            </button>
            {specialties.map(s => (
              <button key={s} onClick={() => setSpecialty(s)}
                style={{ padding: '6px 14px', fontSize: 13, borderRadius: 20, border: '1px solid #2c3e50', cursor: 'pointer', background: specialty === s ? '#2c3e50' : 'white', color: specialty === s ? 'white' : '#2c3e50' }}>
                {s}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>
            {loading ? '로딩 중...' : `총 ${sorted.length}건`}
          </div>
        </div>

        {/* 테이블 */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 180 }} />
              <col />
              <col style={{ width: 70 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 60 }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ ...thStyle, cursor: 'default' }}>번호</th>
                <th style={thStyle} onClick={() => toggleSort('name')}>사업장명{arrow('name')}</th>
                <th style={thStyle}>도로명주소</th>
                {specialty === '' && <th style={thStyle}>과목</th>}
                <th style={thStyle} onClick={() => toggleSort('license_date')}>인허가일자{arrow('license_date')}</th>
                <th style={thStyle} onClick={() => toggleSort('staff_count')}>의료인수{arrow('staff_count')}</th>
                <th style={thStyle} onClick={() => toggleSort('area_pyeong')}>평수{arrow('area_pyeong')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#999' }}>데이터가 없습니다.</td></tr>
              )}
              {sorted.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#888' }}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#2c3e50' }}>{row.name}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#555' }}>{row.address ?? '-'}</td>
                  {specialty === '' && <td style={{ ...tdStyle, textAlign: 'center', fontSize: 12 }}>{row.specialty ?? '-'}</td>}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{row.license_date ?? '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{row.staff_count ?? '-'}</td>
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
