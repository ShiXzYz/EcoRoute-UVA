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
    ev: 'driving',
    solo_car: 'driving',
    carpool_2: 'driving',
    carpool_3: 'driving',
    cat_bus: 'transit',
    uts_bus: 'transit',
    trolley: 'transit',
  };

  const directionsMode = modeMap[mode] || 'driving';

  try {
    const response = await fetch(
      `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: parseFloat(origin.split(',')[0]), longitude: parseFloat(origin.split(',')[1]) } } },
          destination: { location: { latLng: { latitude: parseFloat(destination.split(',')[0]), longitude: parseFloat(destination.split(',')[1]) } } },
          travelMode: directionsMode.toUpperCase(),
        }),
      }
    );
    const data = await response.json();

    if (data.error) {
      console.error('Routes API error:', data.error);
      return NextResponse.json(
        { error: data.error.message || 'Routes API error' },
        { status: 500 }
      );
    }

    const routes = (data.routes || []).map((route: any) => {
      const encodedPolyline = route.polyline?.encodedPolyline;
      const decodedPoints = encodedPolyline ? decodePolyline(encodedPolyline) : [];
      
      return {
        points: decodedPoints,
        distance: route.distanceMeters || 0,
        duration: route.duration || '0s',
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
