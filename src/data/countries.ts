export type Country = {
  name: string;
  code: string; // ISO-2
  flag: string;
  dial: string;
  popular?: boolean;
};

// Popular first, then the rest.
export const countries: Country[] = [
  { name: "Denmark", code: "DK", flag: "🇩🇰", dial: "+45", popular: true },
  { name: "United States", code: "US", flag: "🇺🇸", dial: "+1", popular: true },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", dial: "+44", popular: true },
  { name: "Germany", code: "DE", flag: "🇩🇪", dial: "+49", popular: true },
  { name: "Sweden", code: "SE", flag: "🇸🇪", dial: "+46", popular: true },
  { name: "Norway", code: "NO", flag: "🇳🇴", dial: "+47", popular: true },
  { name: "France", code: "FR", flag: "🇫🇷", dial: "+33", popular: true },
  { name: "Spain", code: "ES", flag: "🇪🇸", dial: "+34", popular: true },
  { name: "Italy", code: "IT", flag: "🇮🇹", dial: "+39", popular: true },
  { name: "Netherlands", code: "NL", flag: "🇳🇱", dial: "+31", popular: true },
  { name: "Poland", code: "PL", flag: "🇵🇱", dial: "+48" },
  { name: "Ireland", code: "IE", flag: "🇮🇪", dial: "+353" },
  { name: "Portugal", code: "PT", flag: "🇵🇹", dial: "+351" },
  { name: "Belgium", code: "BE", flag: "🇧🇪", dial: "+32" },
  { name: "Austria", code: "AT", flag: "🇦🇹", dial: "+43" },
  { name: "Switzerland", code: "CH", flag: "🇨🇭", dial: "+41" },
  { name: "Finland", code: "FI", flag: "🇫🇮", dial: "+358" },
  { name: "Canada", code: "CA", flag: "🇨🇦", dial: "+1" },
  { name: "Australia", code: "AU", flag: "🇦🇺", dial: "+61" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪", dial: "+971" },
  { name: "Turkey", code: "TR", flag: "🇹🇷", dial: "+90" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", dial: "+55" },
  { name: "Mexico", code: "MX", flag: "🇲🇽", dial: "+52" },
  { name: "Japan", code: "JP", flag: "🇯🇵", dial: "+81" },
  { name: "India", code: "IN", flag: "🇮🇳", dial: "+91" },
  { name: "Singapore", code: "SG", flag: "🇸🇬", dial: "+65" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦", dial: "+27" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿", dial: "+64" },
];

export const countryByName = (name: string) => countries.find((c) => c.name === name);

// Postal code validation per country.
const postalRules: Record<string, { re: RegExp; hint: string }> = {
  DK: { re: /^\d{4}$/, hint: "Denmark postal codes are exactly 4 digits." },
  NO: { re: /^\d{4}$/, hint: "Norway postal codes are exactly 4 digits." },
  SE: { re: /^\d{3}\s?\d{2}$/, hint: "Sweden postal codes are 5 digits (e.g. 123 45)." },
  US: { re: /^\d{5}(-\d{4})?$/, hint: "US ZIP codes are 5 digits or ZIP+4." },
  GB: { re: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/, hint: "Enter a valid UK postcode." },
  DE: { re: /^\d{5}$/, hint: "Germany postal codes are 5 digits." },
  FR: { re: /^\d{5}$/, hint: "France postal codes are 5 digits." },
};

export function validatePostal(postal: string, countryName: string): string | null {
  const p = postal.trim();
  if (!p) return "Postal code is required.";
  const c = countryByName(countryName);
  const rule = c ? postalRules[c.code] : undefined;
  if (rule) return rule.re.test(p) ? null : rule.hint;
  // Generic fallback: alphanumeric + space/hyphen, no other symbols.
  return /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(p) ? null : "Enter a valid postal code.";
}

// Phone: store digits in E.164-ish style. Validate by selected country dial code.
const phoneAllowed = /^[\d\s()+-]*$/;
export function sanitizePhoneInput(v: string) {
  return v.replace(/[^\d\s()+-]/g, "");
}

export function validatePhone(phone: string, countryName: string): string | null {
  const c = countryByName(countryName);
  const label = countryName || "your country";
  if (!phoneAllowed.test(phone)) return `Enter a valid phone number for ${label}.`;
  const digits = phone.replace(/\D/g, "");
  const dialDigits = c ? c.dial.replace(/\D/g, "") : "";
  // Strip the country dial code if the user typed it.
  const local = digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;
  if (local.length < 6 || local.length > 13) return `Enter a valid phone number for ${label}.`;
  return null;
}

// Compose stored E.164 number from local input + selected country.
export function toE164(phone: string, countryName: string): string {
  const c = countryByName(countryName);
  const digits = phone.replace(/\D/g, "");
  if (!c) return digits ? `+${digits}` : "";
  const dialDigits = c.dial.replace(/\D/g, "");
  const local = digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;
  return `${c.dial} ${local}`.trim();
}

export const nameRe = /^[A-Za-zÀ-ÿ' -]{2,}$/;
export const cityRe = /^[A-Za-zÀ-ÿ' -]{2,}$/;

export function validateAge18(dob: string): string | null {
  if (!dob) return "Date of birth is required.";
  const d = new Date(dob);
  if (isNaN(d.getTime()) || d > new Date()) return "Enter a valid date.";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 18) return "You must be at least 18 to use PayCrivo checkout.";
  if (age > 120) return "Enter a valid date.";
  return null;
}
