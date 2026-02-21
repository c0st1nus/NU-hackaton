const TWOGIS_KEY = process.env.TWOGIS_API_KEY || "";

export interface AddressSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * 2GIS Suggest API — address autocomplete with excellent Kazakhstan coverage.
 */
export async function searchAddress(
  query: string,
  limit = 5,
  city?: string
): Promise<AddressSuggestion[]> {
  if (!TWOGIS_KEY) {
    console.error("TWOGIS_API_KEY not set");
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: city ? `${city} ${query}` : query,
      key: TWOGIS_KEY,
      locale: "ru_KZ",
      fields: "items.point,items.full_name",
    });

    const url = `https://catalog.api.2gis.com/3.0/suggests?${params}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    const items = json.result?.items;
    if (!items || items.length === 0) return [];

    return items
      .filter((item: any) => item.point)
      .slice(0, limit)
      .map((item: any) => ({
        displayName: item.full_name || item.name || "",
        latitude: item.point.lat,
        longitude: item.point.lon,
      }));
  } catch (err) {
    console.error("2GIS suggest failed:", err);
    return [];
  }
}

/**
 * 2GIS Geocoder — get coordinates for an address.
 */
export async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  if (!TWOGIS_KEY) {
    console.error("TWOGIS_API_KEY not set");
    return null;
  }

  try {
    const params = new URLSearchParams({
      q: address,
      key: TWOGIS_KEY,
      fields: "items.point",
    });

    const url = `https://catalog.api.2gis.com/3.0/items/geocode?${params}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const items = json.result?.items;
    if (!items || items.length === 0) return null;

    const point = items[0].point;
    if (!point) return null;

    return {
      latitude: point.lat,
      longitude: point.lon,
    };
  } catch (err) {
    console.error("2GIS geocode failed:", err);
    return null;
  }
}
