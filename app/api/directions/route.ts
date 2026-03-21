import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const mode = searchParams.get('mode') || 'driving';

  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'Origin and destination are required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    );
  }

  const modeMap: Record<string, string> = {
    walking: 'walking',
    bike: 'bicycling',
    ebike: 'bicycling',
    solo_car: 'driving',
    carpool_2: 'driving',
    carpool_3: 'driving',
    cat_bus: 'transit',
    uts_bus: 'transit',
    trolley: 'transit',
  };

  const directionsMode = modeMap[mode] || 'driving';

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    url.searchParams.set('mode', directionsMode);
    url.searchParams.set('key', apiKey);

    if (directionsMode === 'transit') {
      url.searchParams.set('alternatives', 'true');
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: `Directions API error: ${data.status}` },
        { status: 500 }
      );
    }

    const routes = (data.routes || []).map((route: any) => {
      const points = route.overview_polyline.points;
      const decodedPoints = decodePolyline(points);
      
      return {
        points: decodedPoints,
        distance: route.legs[0]?.distance?.value || 0,
        duration: route.legs[0]?.duration?.value || 0,
        summary: route.summary,
      };
    });

    return NextResponse.json({
      routes,
      status: data.status,
    });
  } catch (error) {
    console.error('Directions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch directions' },
      { status: 500 }
    );
  }
}

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
}
