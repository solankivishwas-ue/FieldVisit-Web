// location.ts — browser Geolocation + Google Maps reverse geocoding helpers.
//
// Maps SDK strategy:
//   Uses the new functional API from @googlemaps/js-api-loader v1:
//     setOptions({ key, version }) → importLibrary('geocoding')
//   The Loader class is deprecated; the free functions are the current API.
//
// Graceful degradation:
//   reverseGeocode() returns '' if VITE_GOOGLE_MAPS_API_KEY is not set,
//   or if the API call fails. The form always works without it.

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

// LocationError uses a plain error code field (not a constructor-param modifier)
// to satisfy the `erasableSyntaxOnly` compiler option.
export type LocationErrorCode = 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';

export class LocationError extends Error {
  code: LocationErrorCode;
  constructor(message: string, code: LocationErrorCode) {
    super(message);
    this.name = 'LocationError';
    this.code = code;
  }
}

/**
 * Requests the user's current position via the browser Geolocation API.
 * Resolves with { latitude, longitude } or rejects with a LocationError.
 */
export function getCurrentPosition(timeoutMs = 10_000): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new LocationError('Geolocation is not supported by this browser.', 'UNSUPPORTED'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        let code: LocationErrorCode;
        switch (err.code) {
          case GeolocationPositionError.PERMISSION_DENIED:   code = 'PERMISSION_DENIED';  break;
          case GeolocationPositionError.POSITION_UNAVAILABLE: code = 'UNAVAILABLE';       break;
          case GeolocationPositionError.TIMEOUT:             code = 'TIMEOUT';            break;
          default:                                           code = 'UNAVAILABLE';
        }
        reject(new LocationError(err.message || 'Unable to determine location.', code));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/**
 * Human-readable message for each LocationError code.
 */
export function locationErrorMessage(err: LocationError): string {
  switch (err.code) {
    case 'PERMISSION_DENIED':
      return 'Location access denied. Please type your address manually.';
    case 'TIMEOUT':
      return 'Location timed out. Please type your address manually.';
    case 'UNSUPPORTED':
      return 'Your browser does not support geolocation. Please type your address manually.';
    default:
      return 'Could not get your location. Please type your address manually.';
  }
}

// ── Google Maps initialisation ─────────────────────────────────────────────────
// Called once; subsequent calls are no-ops because the SDK loads idempotently.

let _mapsInitialised = false;

async function initMaps(apiKey: string): Promise<void> {
  if (_mapsInitialised) return;
  const { setOptions } = await import('@googlemaps/js-api-loader');
  setOptions({ key: apiKey, v: 'weekly' });
  _mapsInitialised = true;
}

// ── Reverse geocoding ──────────────────────────────────────────────────────────

let _geocoder: google.maps.Geocoder | null = null;

/**
 * Reverse-geocodes a lat/lon pair using the Maps Geocoding API.
 * Returns '' if the API key is missing, no results, or any error.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) return '';

  try {
    await initMaps(apiKey);
    if (!_geocoder) {
      const { importLibrary } = await import('@googlemaps/js-api-loader');
      const { Geocoder } = await importLibrary('geocoding');
      _geocoder = new Geocoder();
    }

    return new Promise((resolve) => {
      _geocoder!.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address ?? '');
          } else {
            resolve('');
          }
        },
      );
    });
  } catch {
    return '';
  }
}

// ── Map initialiser export ─────────────────────────────────────────────────────
// Used by MapPicker to load the maps + marker libraries before rendering.

export async function loadMapsLibraries(apiKey: string): Promise<void> {
  await initMaps(apiKey);
  const { importLibrary } = await import('@googlemaps/js-api-loader');
  await Promise.all([importLibrary('maps'), importLibrary('marker')]);
}

