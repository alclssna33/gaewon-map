'use client'

import { useEffect, useRef, useState } from 'react'
import type { Clinic } from '@/lib/supabase'

type ViewMode = 'default' | 'size' | 'staff'

interface MapProps {
  clinics: Clinic[]
  viewMode: ViewMode
}

function getColor(val: number, mode: ViewMode): string {
  if (mode === 'size') {
    return val > 150 ? '#800026' : val > 100 ? '#BD0026' : val > 50 ? '#FD8D3C' : '#FED976'
  }
  if (mode === 'staff') {
    return val >= 4 ? '#5B2C6F' : val >= 3 ? '#DA3C78' : val >= 2 ? '#E67E22' : '#F1C40F'
  }
  return '#3498db'
}

export default function Map({ clinics, viewMode }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)
  const clusterRef = useRef<import('leaflet.markercluster').MarkerClusterGroup | null>(null)

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

      clinics.forEach(item => {
        const val = viewMode === 'size' ? (item.area_pyeong ?? 0) : viewMode === 'staff' ? (item.staff_count ?? 0) : 0
        const dong = (item.address ?? '').split(' ')[2] ?? ''
        const naverLink = `https://map.naver.com/v5/search/${encodeURIComponent(item.name + ' ' + dong)}`

        const marker = L.circleMarker([item.lat, item.lng], {
          radius: 11,
          fillColor: getColor(val, viewMode),
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9,
        }).bindPopup(`
          <span style="font-weight:bold;font-size:17px;display:block;margin-bottom:4px">${item.name}</span>
          <hr style="margin:6px 0;border:0;border-top:1px solid #eee">
          📅 <b>인허가:</b> ${item.license_date ?? '-'}<br>
          📍 <b>주소:</b> ${item.address ?? '-'}<br>
          👥 <b>인원:</b> <span style="color:#e74c3c;font-weight:bold">${item.staff_count ?? '-'}명</span>
          &nbsp;📐 <b>규모:</b> <span style="color:#e74c3c;font-weight:bold">${item.area_pyeong ? Math.round(item.area_pyeong) : '-'}평</span><br>
          <a href="${naverLink}" target="_blank"
            style="display:inline-block;margin-top:8px;background:#2db400;color:#fff;padding:5px 10px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:13px">
            네이버 지도 보기
          </a>
        `)
        clusterRef.current!.addLayer(marker)
      })
    }

    initMap()
  }, [clinics, viewMode])

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
}
