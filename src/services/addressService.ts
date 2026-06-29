import { countryByName } from "@/data/countries";

export type AddressSuggestion = {
  label: string;
  address: string;
  city: string;
  postal: string;
  country: string;
};

const PROVIDER = (import.meta.env.VITE_ADDRESS_PROVIDER as string | undefined) ?? "nominatim";

// Local fallback suggestions for popular countries when the live API is unavailable.
const MOCK: Record<string, AddressSuggestion[]> = {
  Denmark: [
    { label: "Vesterbrogade 1, 1620 København", address: "Vesterbrogade 1", city: "København", postal: "1620", country: "Denmark" },
    { label: "Nørregade 10, 8000 Aarhus", address: "Nørregade 10", city: "Aarhus", postal: "8000", country: "Denmark" },
  ],
  "United States": [
    { label: "350 5th Ave, New York, 10118", address: "350 5th Ave", city: "New York", postal: "10118", country: "United States" },
    { label: "1 Market St, San Francisco, 94105", address: "1 Market St", city: "San Francisco", postal: "94105", country: "United States" },
  ],
  Germany: [
    { label: "Unter den Linden 77, 10117 Berlin", address: "Unter den Linden 77", city: "Berlin", postal: "10117", country: "Germany" },
    { label: "Marienplatz 8, 80331 München", address: "Marienplatz 8", city: "München", postal: "80331", country: "Germany" },
  ],
  "United Kingdom": [
    { label: "10 Downing St, London, SW1A 2AA", address: "10 Downing St", city: "London", postal: "SW1A 2AA", country: "United Kingdom" },
  ],
};

function mockSuggestions(query: string, country: string): AddressSuggestion[] {
  const base = MOCK[country] ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return base;
  const filtered = base.filter((s) => s.label.toLowerCase().includes(q));
  return filtered.length ? filtered : base;
}

export async function searchAddress(query: string, country: string): Promise<{ results: AddressSuggestion[]; degraded: boolean }> {
  if (query.trim().length < 3) return { results: [], degraded: false };
  if (PROVIDER === "nominatim") {
    try {
      const c = countryByName(country);
      const cc = c ? `&countrycodes=${c.code.toLowerCase()}` : "";
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(query)}${cc}`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as Array<{ display_name: string; address?: Record<string, string> }>;
      const results: AddressSuggestion[] = data.map((d) => {
        const a = d.address ?? {};
        const street = [a.road, a.house_number].filter(Boolean).join(" ");
        return {
          label: d.display_name,
          address: street || (d.display_name.split(",")[0] ?? ""),
          city: a.city || a.town || a.village || a.municipality || "",
          postal: a.postcode || "",
          country: a.country || country,
        };
      });
      if (results.length) return { results, degraded: false };
      return { results: mockSuggestions(query, country), degraded: false };
    } catch {
      return { results: mockSuggestions(query, country), degraded: true };
    }
  }
  return { results: mockSuggestions(query, country), degraded: true };
}
