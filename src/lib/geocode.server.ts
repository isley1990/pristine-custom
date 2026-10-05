/** US address -> coordinates using the free US Census geocoder (no API key). */
export type Geo = { matched: string; lat: number; lng: number; zip: string };

export async function geocodeUS(address: string): Promise<Geo | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { addressMatches?: { matchedAddress: string; coordinates: { x: number; y: number }; addressComponents?: { zip?: string } }[] };
    };
    const m = json.result?.addressMatches?.[0];
    if (!m) return null;
    return { matched: m.matchedAddress, lat: m.coordinates.y, lng: m.coordinates.x, zip: m.addressComponents?.zip ?? "" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
