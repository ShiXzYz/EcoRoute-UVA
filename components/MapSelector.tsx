'use client';

import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '@/lib/GoogleMapsContext';

interface Location {
  lat: number;
  lng: number;
  name: string;
  displayName?: string;
}

interface RouteData {
  points: { lat: number; lng: number }[];
  color?: string;
}

interface TransitStopMarker {
  origin: { id: string; lat: number; lon: number; name?: string };
  destination: { id: string; lat: number; lon: number; name?: string };
  shapePoints?: { lat: number; lng: number }[];
}

interface MapSelectorProps {
  onLocationSelect: (location: Location, type: 'from' | 'to') => void;
  fromLocation: Location | null;
  toLocation: Location | null;
  selectedType: 'from' | 'to' | null;
  route?: RouteData | null;
  mode?: string;
  transitStops?: TransitStopMarker;
  mapType?: 'roadmap' | 'satellite';
  onMapTypeChange?: (type: 'roadmap' | 'satellite') => void;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 38.0336,
  lng: -78.5080,
};

const modeColors: Record<string, string> = {
  walking: '#10B981',
  bike: '#F59E0B',
  ebike: '#8B5CF6',
  solo_car: '#EF4444',
  carpool_2: '#F97316',
  carpool_3: '#F97316',
  cat_bus: '#3B82F6',
  uts_bus: '#3B82F6',
  trolley: '#3B82F6',
};

export default function MapSelector({
  onLocationSelect,
  fromLocation,
  toLocation,
  selectedType,
  route,
  mode,
  transitStops,
  mapType = 'roadmap',
  onMapTypeChange,
}: MapSelectorProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  // eslint-disable-next-line
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const transitMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const transitPolylineRef = useRef<google.maps.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const lastGeocodeTime = useRef<number>(0);
  const GEOCODE_COOLDOWN = 1000;
  const geocodeCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isLoaded || mapInstanceRef.current || !mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      fullscreenControl: false,
      mapId: '27ee17fe3338eb9aeeeff1a2',
    });

    mapInstanceRef.current = map;
    setMapReady(true);

    mapInstanceRef.current = map;
    setMapReady(true);

    map.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const type = selectedType || (!fromLocation ? 'from' : 'to');

      const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

      if (geocodeCache.current.has(cacheKey)) {
        const cachedName = geocodeCache.current.get(cacheKey)!;
        onLocationSelect({ lat, lng, name: cachedName, displayName: cachedName }, type);
        return;
      }

      const now = Date.now();
      if (now - lastGeocodeTime.current < GEOCODE_COOLDOWN) {
        const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        onLocationSelect({ lat, lng, name, displayName: name }, type);
        return;
      }
      lastGeocodeTime.current = now;

      try {
        const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await response.json();

        let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (data.results && data.results[0]) {
          name = data.results[0].formatted_address;
        }

        geocodeCache.current.set(cacheKey, name);
        if (geocodeCache.current.size > 100) {
          const firstKey = geocodeCache.current.keys().next().value;
          if (firstKey) geocodeCache.current.delete(firstKey);
        }

        onLocationSelect({ lat, lng, name, displayName: name }, type);
      } catch (error) {
        const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        onLocationSelect({ lat, lng, name, displayName: name }, type);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    };
  }, [isLoaded, onLocationSelect, selectedType, fromLocation]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const map = mapInstanceRef.current;

    if (fromLocation) {
      const fromMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: fromLocation.lat, lng: fromLocation.lng },
        title: 'From: ' + fromLocation.name,
      });
      markersRef.current.push(fromMarker);
    }

    if (toLocation) {
      const toMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: toLocation.lat, lng: toLocation.lng },
        title: 'To: ' + toLocation.name,
      });
      markersRef.current.push(toMarker);
    }

    if (route?.points && route.points.length > 0) {
      const routeColor = route.color || modeColors[mode || 'walking'] || '#00A3E0';
      polylineRef.current = new google.maps.Polyline({
        path: route.points,
        strokeColor: routeColor,
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map,
      });

      const bounds = new google.maps.LatLngBounds();
      route.points.forEach(point => bounds.extend(point));
      map.fitBounds(bounds, 80);
    }
    // No straight line - only show route after mode is selected
  }, [mapReady, fromLocation, toLocation, route, mode]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    transitMarkersRef.current.forEach(marker => marker.map = null);
    transitMarkersRef.current = [];
    if (transitPolylineRef.current) {
      transitPolylineRef.current.setMap(null);
    }

    // Clear main polyline when showing transit route
    const transitModes = ['uts_bus', 'cat_bus', 'connect_bus'];
    const isTransitMode = mode && transitModes.some(t => mode.startsWith(t));
    if (isTransitMode && polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    if (!transitStops || !isTransitMode) return;

    const map = mapInstanceRef.current;

    if (transitStops.origin) {
      const originName = transitStops.origin.name || transitStops.origin.id;
      const originMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: transitStops.origin.lat, lng: transitStops.origin.lon },
        title: `🚌 Board here: ${originName}`,
      });
      transitMarkersRef.current.push(originMarker);
    }

    if (transitStops.destination) {
      const destName = transitStops.destination.name || transitStops.destination.id;
      const destMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: transitStops.destination.lat, lng: transitStops.destination.lon },
        title: `🚌 Get off here: ${destName}`,
      });
      transitMarkersRef.current.push(destMarker);
    }

    // Draw polyline for transit route
    if (transitStops.shapePoints && transitStops.shapePoints.length > 1) {
      const agencyColors: Record<string, string> = {
        uts_bus: '#232D4B',
        cat_bus: '#007A53',
        connect_bus: '#D97706',
      };
      const transitModeKey = Object.keys(agencyColors).find(k => mode?.startsWith(k)) || 'uts_bus';
      const polylineColor = agencyColors[transitModeKey] || '#3B82F6';

      transitPolylineRef.current = new google.maps.Polyline({
        path: transitStops.shapePoints.map(p => ({ lat: p.lat, lng: p.lng })),
        strokeColor: polylineColor,
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map,
      });
    }

    if (fromLocation) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: fromLocation.lat, lng: fromLocation.lng });
      if (transitStops.origin) {
        bounds.extend({ lat: transitStops.origin.lat, lng: transitStops.origin.lon });
      }
      if (transitStops.destination) {
        bounds.extend({ lat: transitStops.destination.lat, lng: transitStops.destination.lon });
      }
      if (toLocation) {
        bounds.extend({ lat: toLocation.lat, lng: toLocation.lng });
      }
      map.fitBounds(bounds, 80);
    }
  }, [mapReady, transitStops, mode, fromLocation, toLocation]);
  // Handle map type changes
  useEffect(() => {
    if (mapInstanceRef.current && mapType) {
      mapInstanceRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  if (loadError) {
    return (
      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
        <p className="text-slate-600">Error loading Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-uva-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <div ref={mapRef} style={containerStyle} />;
}
