'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import type { MogahaClinic } from '@/lib/supabase'

type ViewMode = 'default' | 'size' | 'staff'
type MapMode  = 'open' | 'closed' | 'all'

export interface MapHandle {
  flyToClinic: (lat: number, lng: number) => void
  setSearchPin: (lat: number, lng: number) => void
}

interface MapProps {
  clinics: MogahaClinic[]
  viewMode: ViewMode
  mapMode: MapMode
}

function getColor(val: number, mode: ViewMode): string {
  if (mode === 'size')  return val > 150 ? '#800026' : val > 100 ? '#BD0026' : val > 50 ? '#FD8D3C' : '#FED976'
  if (mode === 'staff') return val >= 4 ? '#5B2C6F' : val >= 3 ? '#DA3C78' : val >= 2 ? '#E67E22' : '#F1C40F'
  return '#3498db'
}

const Map = forwardRef<MapHandle, MapProps>(({ clinics, viewMode, mapMode }, ref) => {
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)
  const clusterRef     = useRef<any>(null)
  const markersRef     = useRef<Record<string, import('leaflet').CircleMarker>>({})
  const searchPinRef   = useRef<import('leaflet').Marker | null>(null)

  useImperativeHandle(ref, () => ({
    flyToClinic: (lat, lng) => {
      const map = mapInstanceRef.current
      const cluster = clusterRef.current
      if (!map || !cluster) return
      map.setView([lat, lng], 16)
      const key = `${lat},${lng}`
      const marker = markersRef.current[key]
      if (marker) {
        // @ts-ignore
        cluster.zoomToShowLayer(marker, () => marker.openPopup())
      }
    },
    setSearchPin: (lat, lng) => {
      const map = mapInstanceRef.current
      if (!map) return
      import('leaflet').then(({ default: L }) => {
        if (searchPinRef.current) searchPinRef.current.remove()
        const icon = L.divIcon({
          className: '',
          html: '<div style="font-size:28px;line-height:1">🚩</div>',
          iconSize: [28, 28],
          iconAnchor: [4, 28],
        })
        searchPinRef.current = L.marker([lat, lng], { icon }).addTo(map)
        map.setView([lat, lng], 14)
      })
    },
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet.markercluster')

      if (!mapRef.current) return

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, { minZoom: 7 }).setView([36.3, 127.8], 7)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstanceRef.current)
        // @ts-ignore
        clusterRef.current = L.markerClusterGroup({ disableClusteringAtZoom: 14 })
        mapInstanceRef.current.addLayer(clusterRef.current)
      }

      if (!clusterRef.current) return
      clusterRef.current.clearLayers()
      markersRef.current = {}

      clinics.forEach(item => {
        const dong = (item.address ?? '').split(' ').slice(0, 3).join(' ')
        const naverLink = `https://map.naver.com/v5/search/${encodeURIComponent(item.name + ' ' + dong)}`

        // ── 폐원 마커 (회색) ────────────────────────────────
        if (item.is_closed) {
          const closedMarker = L.circleMarker([item.lat, item.lng], {
            radius: 9,
            fillColor: '#95a5a6',
            color: '#7f8c8d',
            weight: 2,
            fillOpacity: 0.75,
          }).bindPopup(`
            <span style="font-weight:bold;font-size:16px;display:block;margin-bottom:4px;color:#555">${item.name}</span>
            <div style="display:inline-block;background:#e74c3c;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;margin-bottom:6px">
              🚫 폐업: ${item.closed_date ?? '-'}
            </div><br>
            📅 <b>개원:</b> ${item.license_date ?? '-'}<br>
            📍 <b>주소:</b> ${item.address ?? '-'}<br>
            🏥 <b>과목:</b> ${item.specialty ?? '-'}<br>
            <a href="${naverLink}" target="_blank"
              style="display:inline-block;margin-top:8px;background:#7f8c8d;color:#fff;padding:5px 10px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:13px">
              네이버 지도 보기
            </a>
          `)
          clusterRef.current!.addLayer(closedMarker)
          markersRef.current[`${item.lat},${item.lng}`] = closedMarker
          return
        }

        // ── 개원(영업중) 마커 ───────────────────────────────
        const val = viewMode === 'size' ? (item.area_pyeong ?? 0) : viewMode === 'staff' ? (item.staff_count ?? 0) : 0

        const transferBadge = item.is_transfer
          ? `<div style="display:inline-block;margin-top:6px;background:#f39c12;color:#fff;padding:3px 8px;border-radius:4px;font-size:12px;font-weight:bold">
               🔄 양수양도 추정: ${item.transfer_date ?? '-'}
             </div><br>`
          : ''

        const marker = L.circleMarker([item.lat, item.lng], {
          radius: 11,
          fillColor: getColor(val, viewMode),
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9,
        }).bindPopup(`
          <span style="font-weight:bold;font-size:17px;display:block;margin-bottom:4px">${item.name}</span>
          <hr style="margin:6px 0;border:0;border-top:1px solid #eee">
          🏥 <b>과목:</b> ${item.specialty ?? '-'}<br>
          📅 <b>개원:</b> ${item.license_date ?? '-'}<br>
          📍 <b>주소:</b> ${item.address ?? '-'}<br>
          👥 <b>인원:</b> <span style="color:#e74c3c;font-weight:bold">${item.staff_count ?? '-'}명</span>
          &nbsp;📐 <b>규모:</b> <span style="color:#e74c3c;font-weight:bold">${item.area_pyeong ? Math.round(item.area_pyeong) : '-'}평</span><br>
          ${transferBadge}
          <a href="${naverLink}" target="_blank"
            style="display:inline-block;margin-top:8px;background:#2db400;color:#fff;padding:5px 10px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:13px">
            네이버 지도 보기
          </a>
        `)
        clusterRef.current!.addLayer(marker)
        markersRef.current[`${item.lat},${item.lng}`] = marker
      })
    }

    initMap()
  }, [clinics, viewMode, mapMode])

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
})

Map.displayName = 'Map'
export default Map
