// Hardcoded coordinates for all 15 Freedom Broker offices
// Verified against maps.google.com — update if incorrect
export const OFFICE_COORDS: Record<string, [number, number]> = {
  Алматы: [43.222, 76.8512],
  Астана: [51.1801, 71.446],
  Шымкент: [42.3417, 69.5901],
  Атырау: [47.1167, 51.8833],
  Актобе: [50.2797, 57.2073],
  Павлодар: [52.2873, 76.9674],
  "Усть-Каменогорск": [49.9839, 82.6143],
  Семей: [50.4112, 80.2275],
  Тараз: [42.9, 71.3667],
  Костанай: [53.2144, 63.6246],
  Кызылорда: [44.8479, 65.5092],
  Уральск: [51.2333, 51.3667],
  Актау: [43.6417, 51.2],
  Петропавловск: [54.875, 69.1611],
  Кокшетау: [53.2844, 69.3961],
};

// City centre fallback when Nominatim is unavailable
const KZ_CITY_FALLBACK: Record<string, [number, number]> = {
  алматы: [43.222, 76.8512],
  "алма-ата": [43.222, 76.8512],
  астана: [51.1801, 71.446],
  "нур-султан": [51.1801, 71.446],
  нурсултан: [51.1801, 71.446],
  шымкент: [42.3417, 69.5901],
  атырау: [47.1167, 51.8833],
  актобе: [50.2797, 57.2073],
  павлодар: [52.2873, 76.9674],
  семей: [50.4112, 80.2275],
  тараз: [42.9, 71.3667],
  костанай: [53.2144, 63.6246],
};

/**
 * Haversine formula — distance in km between two lat/lon points
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest Freedom Broker office for given coordinates
 */
export function findNearestOffice(lat: number, lon: number): string {
  let nearest = "";
  let minDist = Infinity;
  for (const [office, [oLat, oLon]] of Object.entries(OFFICE_COORDS)) {
    const dist = haversine(lat, lon, oLat, oLon);
    if (dist < minDist) {
      minDist = dist;
      nearest = office;
    }
  }
  return nearest;
}

/**
 * Geocode a Kazakhstan address using Nominatim with city-centre fallback.
 * Returns null for non-Kazakhstan addresses.
 */
export async function geocodeAddress(
  country: string | null,
  city: string | null,
  street: string | null,
  house: string | null,
): Promise<[number, number] | null> {
  const kzVariants = ["казахстан", "kazakhstan", "kz", "қазақстан"];
  if (!country || !kzVariants.includes(country.toLowerCase().trim())) {
    return null;
  }

  // 1. Try Nominatim
  if (city || street) {
    try {
      const query = [street, house, city, "Kazakhstan"]
        .filter(Boolean)
        .join(", ");
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "FIRE-Hackathon/1.0 (hackathon@freedom.kz)" },
        signal: AbortSignal.timeout(4000),
      });
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch {
      // Nominatim unavailable or timed out — fall through to city fallback
    }
  }

  // 2. City-centre fallback
  if (city) {
    const key = city.toLowerCase().trim();
    for (const [variant, coords] of Object.entries(KZ_CITY_FALLBACK)) {
      if (key.includes(variant) || variant.includes(key)) {
        return coords;
      }
    }
  }

  return null;
}
