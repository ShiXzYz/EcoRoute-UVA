'use client';

import { useEffect, useRef, useState } from 'react';

interface Location {
  lat: number;
  lng: number;
  name: string;
}

interface MapSelectorProps {
  onLocationSelect: (location: Location, type: 'from' | 'to') => void;
  fromLocation: Location | null;
  toLocation: Location | null;
  selectedType: 'from' | 'to' | null;
}

export default function MapSelector({
  onLocationSelect,
  fromLocation,
  toLocation,
  selectedType,
}: MapSelectorProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const fromMarkerRef = useRef<any>(null);
  const toMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((module) => {
      setL(module.default);
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || !L) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([38.0336, -78.5080], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [L]);

  useEffect(() => {
    if (!mapRef.current || !L) return;

    const map = mapRef.current;
    
    const createIcon = (color: string) => L.divIcon({
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });

    const fromIcon = createIcon('#00A3E0');
    const toIcon = createIcon('#EF4444');

    const handleMapClick = (e: any) => {
      const { lat, lng } = e.latlng;
      const locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const location: Location = { lat, lng, name: locationName };

      const type = selectedType || (!fromLocation ? 'from' : 'to');
      
      if (type === 'from') {
        if (fromMarkerRef.current) fromMarkerRef.current.remove();
        fromMarkerRef.current = L.marker([lat, lng], { icon: fromIcon })
          .bindPopup(`<strong>From:</strong> ${locationName}`)
          .addTo(map);
        onLocationSelect(location, 'from');
      } else {
        if (toMarkerRef.current) toMarkerRef.current.remove();
        toMarkerRef.current = L.marker([lat, lng], { icon: toIcon })
          .bindPopup(`<strong>To:</strong> ${locationName}`)
          .addTo(map);
        onLocationSelect(location, 'to');

        if (fromMarkerRef.current) {
          if (routeLineRef.current) {
            routeLineRef.current.remove();
          }
          routeLineRef.current = L.polyline(
            [
              fromMarkerRef.current.getLatLng(),
              toMarkerRef.current.getLatLng(),
            ],
            { color: '#00A3E0', weight: 4, opacity: 0.8, dashArray: '10, 10' }
          ).addTo(map);

          const bounds = routeLineRef.current.getBounds();
          map.fitBounds(bounds.pad(0.2));
        }
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [L, fromLocation, toLocation, selectedType, onLocationSelect]);

  // Update route line when markers change
  useEffect(() => {
    if (!mapRef.current || !L) return;
    if (!fromLocation || !toLocation) return;
    
    const map = mapRef.current;
    
    // Remove old line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
    }
    
    // Draw new line
    routeLineRef.current = L.polyline(
      [
        [fromLocation.lat, fromLocation.lng],
        [toLocation.lat, toLocation.lng],
      ],
      { color: '#00A3E0', weight: 4, opacity: 0.8, dashArray: '10, 10' }
    ).addTo(map);

    const bounds = routeLineRef.current.getBounds();
    map.fitBounds(bounds.pad(0.2));
  }, [L, fromLocation, toLocation]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
  );
}
