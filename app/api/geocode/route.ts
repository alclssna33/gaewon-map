import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')
  if (!address) return NextResponse.json(null)

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ' 대한민국')}&format=json&limit=1`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'gaewon-map/1.0' },
    })
    const data = await res.json()
    if (!data.length) return NextResponse.json(null)

    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    })
  } catch {
    return NextResponse.json(null, { status: 500 })
  }
}
