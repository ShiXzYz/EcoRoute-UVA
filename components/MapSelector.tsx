'use client';

import { useEffect, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

interface Location {
  lat: number;
  lng: number;
  name: string;
  displayName?: string;
}

interface MapSelectorProps {
  onLocationSelect: (location: Location, type: 'from' | 'to') => void;
  fromLocation: Location | null;
  toLocation: Location | null;
  selectedType: 'from' | 'to' | null;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 38.0336,
  lng: -78.5080,
};

export default function MapSelector({
  onLocationSelect,
  fromLocation,
  toLocation,
  selectedType,
}: MapSelectorProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Rate limiting for geocoding
  const lastGeocodeTime = useRef<number>(0);
  const GEOCODE_COOLDOWN = 1000; // 1 second between geocode requests
  const geocodeCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isLoaded || mapInstanceRef.current || !mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      disableDefaultUI: false,
      zoomControl: true,
      mapId: 'DEMO_MAP_ID',
    });

    mapInstanceRef.current = map;
    setMapLoaded(true);

    map.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const type = selectedType || (!fromLocation ? 'from' : 'to');

      // Cache key for this location
      const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      
      // Check cache first
      if (geocodeCache.current.has(cacheKey)) {
        const cachedName = geocodeCache.current.get(cacheKey)!;
        onLocationSelect({ lat, lng, name: cachedName, displayName: cachedName }, type);
        return;
      }

      // Rate limiting
      const now = Date.now();
      if (now - lastGeocodeTime.current < GEOCODE_COOLDOWN) {
        // Just use coordinates without geocoding
        const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        onLocationSelect({ lat, lng, name, displayName: name }, type);
        return;
      }
      lastGeocodeTime.current = now;

      // Reverse geocode via API
      try {
        const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await response.json();
        
        let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (data.results && data.results[0]) {
          name = data.results[0].formatted_address;
        }
        
        // Cache the result
        geocodeCache.current.set(cacheKey, name);
        if (geocodeCache.current.size > 100) {
          const firstKey = geocodeCache.current.keys().next().value;
          if (firstKey) geocodeCache.current.delete(firstKey);
        }
        
        onLocationSelect({ lat, lng, name, displayName: name }, type);
      } catch (error) {
        // Fallback to coordinates
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
    if (!mapLoaded || !mapInstanceRef.current) return;

    // Clear old markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const map = mapInstanceRef.current;

    // Add markers using AdvancedMarkerElement
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

    // Draw route line
    if (fromLocation && toLocation) {
      polylineRef.current = new google.maps.Polyline({
        path: [
          { lat: fromLocation.lat, lng: fromLocation.lng },
          { lat: toLocation.lat, lng: toLocation.lng },
        ],
        strokeColor: '#00A3E0',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map,
      });

      // Fit bounds
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: fromLocation.lat, lng: fromLocation.lng });
      bounds.extend({ lat: toLocation.lat, lng: toLocation.lng });
      map.fitBounds(bounds, 50);
    }
  }, [mapLoaded, fromLocation, toLocation]);

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
