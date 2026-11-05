import { GpsLocation } from '../types';

/**
 * Získá aktuální GPS souřadnice zařízení přes HTML5 Geolocation API.
 * Pokud uživatel nepovolí polohu nebo dojde k timeoutu, vrátí null
 * a aplikace pokračuje bez zablokování.
 */
export async function getCurrentGpsLocation(timeoutMs: number = 8000): Promise<GpsLocation | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    console.warn('Geolocation API není v tomto prohlížeči podporováno.');
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('Získání GPS souřadnic vypršelo (timeout).');
        resolve(null);
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy || 0);

        const location: GpsLocation = {
          latitude: lat,
          longitude: lng,
          accuracy,
          timestamp: new Date().toISOString(),
        };

        // Zkusíme na pozadí získat orientační město / ulici
        try {
          const address = await reverseGeocode(lat, lng);
          if (address) {
            location.address = address;
          }
        } catch {
          // Ignorujeme chyby reverzního geokódování
        }

        resolve(location);
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        console.warn('Nepodařilo se získat GPS polohu:', err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000, // 1 minuta cache
      }
    );
  });
}

/**
 * Pokusí se reverzně geokódovat souřadnice pomocí OpenStreetMap Nominatim
 */
const geocodeCache = new Map<string, string>();

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'cs,en',
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address;
    if (!addr) return data.display_name?.split(',').slice(0, 2).join(',') || null;

    const road = addr.road || addr.pedestrian || addr.suburb || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const parts = [road, city].filter(Boolean);
    const result = parts.join(', ') || data.display_name?.split(',')[0] || '';

    if (result) {
      geocodeCache.set(cacheKey, result);
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Formátuje GPS souřadnice do čitelného tvaru
 * Např.: "50.0875° N, 14.4213° E"
 */
export function formatGpsCoords(loc?: GpsLocation | null): string {
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
    return 'Poloha nezaznamenána';
  }
  const latDir = loc.latitude >= 0 ? 'N' : 'S';
  const lngDir = loc.longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(loc.latitude).toFixed(4)}° ${latDir}, ${Math.abs(loc.longitude).toFixed(4)}° ${lngDir}`;
}

/**
 * Odkaz na Google Maps
 */
export function getGoogleMapsUrl(loc: GpsLocation): string {
  return `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
}

/**
 * Odkaz na české Mapy.cz (velmi populární v ČR na stavbách a v terénu)
 */
export function getMapyCzUrl(loc: GpsLocation): string {
  return `https://mapy.cz/zakladni?q=${loc.latitude},${loc.longitude}&z=17`;
}

/**
 * Výpočet vzdálenosti mezi dvěma GPS body (Haversine formula v metrech)
 */
export function calculateDistanceMeters(loc1: GpsLocation, loc2: GpsLocation): number {
  const R = 6371e3; // Poloměr Země v metrech
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formátuje vzdálenost (např. "85 m", "1.4 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
