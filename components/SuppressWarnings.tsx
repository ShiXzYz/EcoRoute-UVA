'use client';

import { useEffect } from 'react';

export default function SuppressWarnings() {
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: Parameters<typeof console.error>) => {
      const message = args[0]?.toString() || '';
      if (
        message.includes('google.maps.places.Autocomplete') ||
        message.includes('google.maps.DirectionsService') ||
        message.includes('deprecated') ||
        message.includes('As of')
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
