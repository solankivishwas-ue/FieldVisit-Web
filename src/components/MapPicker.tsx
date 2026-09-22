// MapPicker — interactive Google Map with a draggable pin.
//
// Uses the new @googlemaps/js-api-loader functional API:
//   setOptions({ key, version }) → google.maps.importLibrary('maps')
//
// Graceful degradation:
//   • No VITE_GOOGLE_MAPS_API_KEY → coordinate-only placeholder
//   • Load error → error state with coords shown

import { useEffect, useRef, useState } from 'react';
import { loadMapsLibraries } from '../utils/location';

interface MapPickerProps {
  lat: number;
  lng: number;
  onPinMoved: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onPinMoved }: MapPickerProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const mapRef         = useRef<HTMLDivElement>(null);
  const markerRef      = useRef<google.maps.Marker | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-key'>(
    apiKey ? 'loading' : 'no-key',
  );

  // Load Maps SDK once
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadMapsLibraries(apiKey)
      .then(() => { if (!cancelled) setStatus('ready'); })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [apiKey]);

  // Initialise map once SDK is ready
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;

    const center = { lat, lng };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;

    const marker = new google.maps.Marker({
      position: center,
      map,
      draggable: true,
      title: 'Visit location — drag to adjust',
      animation: google.maps.Animation.DROP,
    });
    markerRef.current = marker;

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) onPinMoved(pos.lat(), pos.lng());
    });

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        onPinMoved(e.latLng.lat(), e.latLng.lng());
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Keep pin in sync when lat/lng change from outside (GPS refresh)
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const pos = { lat, lng };
      markerRef.current.setPosition(pos);
      mapInstanceRef.current.panTo(pos);
    }
  }, [lat, lng]);

  if (status === 'no-key') {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
        <p className="font-medium text-gray-700">Map preview unavailable</p>
        <p className="mt-1 text-xs">
          Add <code className="font-mono bg-gray-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to{' '}
          <code className="font-mono bg-gray-100 px-1 rounded">.env</code> to enable the interactive map.
        </p>
        <p className="mt-2 tabular-nums text-xs text-gray-400">
          Saved coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 text-center">
        Failed to load Google Maps. Coordinates will still be saved.
        <p className="mt-1 tabular-nums text-xs">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div ref={mapRef} className="w-full h-56" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      )}

      {status === 'ready' && (
        <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-0.5 text-xs tabular-nums text-gray-500 shadow">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}

