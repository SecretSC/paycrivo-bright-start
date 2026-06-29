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
  ...([
    ["Afghanistan","AF","+93"],["Albania","AL","+355"],["Algeria","DZ","+213"],["Andorra","AD","+376"],
    ["Angola","AO","+244"],["Argentina","AR","+54"],["Armenia","AM","+374"],["Australia","AU","+61"],
    ["Austria","AT","+43"],["Azerbaijan","AZ","+994"],["Bahamas","BS","+1"],["Bahrain","BH","+973"],
    ["Bangladesh","BD","+880"],["Belarus","BY","+375"],["Belgium","BE","+32"],["Belize","BZ","+501"],
    ["Benin","BJ","+229"],["Bolivia","BO","+591"],["Bosnia and Herzegovina","BA","+387"],["Botswana","BW","+267"],
    ["Brazil","BR","+55"],["Brunei","BN","+673"],["Bulgaria","BG","+359"],["Burkina Faso","BF","+226"],
    ["Cambodia","KH","+855"],["Cameroon","CM","+237"],["Canada","CA","+1"],["Chile","CL","+56"],
    ["China","CN","+86"],["Colombia","CO","+57"],["Costa Rica","CR","+506"],["Croatia","HR","+385"],
    ["Cyprus","CY","+357"],["Czechia","CZ","+420"],["Dominican Republic","DO","+1"],["Ecuador","EC","+593"],
    ["Egypt","EG","+20"],["El Salvador","SV","+503"],["Estonia","EE","+372"],["Ethiopia","ET","+251"],
    ["Fiji","FJ","+679"],["Finland","FI","+358"],["Georgia","GE","+995"],["Ghana","GH","+233"],
    ["Greece","GR","+30"],["Guatemala","GT","+502"],["Honduras","HN","+504"],["Hong Kong","HK","+852"],
    ["Hungary","HU","+36"],["Iceland","IS","+354"],["India","IN","+91"],["Indonesia","ID","+62"],
    ["Iraq","IQ","+964"],["Ireland","IE","+353"],["Israel","IL","+972"],["Jamaica","JM","+1"],
    ["Japan","JP","+81"],["Jordan","JO","+962"],["Kazakhstan","KZ","+7"],["Kenya","KE","+254"],
    ["Kuwait","KW","+965"],["Latvia","LV","+371"],["Lebanon","LB","+961"],["Libya","LY","+218"],
    ["Liechtenstein","LI","+423"],["Lithuania","LT","+370"],["Luxembourg","LU","+352"],["Malaysia","MY","+60"],
    ["Malta","MT","+356"],["Mexico","MX","+52"],["Moldova","MD","+373"],["Monaco","MC","+377"],
    ["Mongolia","MN","+976"],["Montenegro","ME","+382"],["Morocco","MA","+212"],["Nepal","NP","+977"],
    ["New Zealand","NZ","+64"],["Nigeria","NG","+234"],["North Macedonia","MK","+389"],["Oman","OM","+968"],
    ["Pakistan","PK","+92"],["Panama","PA","+507"],["Paraguay","PY","+595"],["Peru","PE","+51"],
    ["Philippines","PH","+63"],["Poland","PL","+48"],["Portugal","PT","+351"],["Qatar","QA","+974"],
    ["Romania","RO","+40"],["Rwanda","RW","+250"],["Saudi Arabia","SA","+966"],["Senegal","SN","+221"],
    ["Serbia","RS","+381"],["Singapore","SG","+65"],["Slovakia","SK","+421"],["Slovenia","SI","+386"],
    ["South Africa","ZA","+27"],["South Korea","KR","+82"],["Sri Lanka","LK","+94"],["Switzerland","CH","+41"],
    ["Taiwan","TW","+886"],["Tanzania","TZ","+255"],["Thailand","TH","+66"],["Tunisia","TN","+216"],
    ["Turkey","TR","+90"],["Uganda","UG","+256"],["Ukraine","UA","+380"],["United Arab Emirates","AE","+971"],
    ["Uruguay","UY","+598"],["Uzbekistan","UZ","+998"],["Venezuela","VE","+58"],["Vietnam","VN","+84"],
    ["Zambia","ZM","+260"],["Zimbabwe","ZW","+263"],
  ] as const)
    .map(([name, code, dial]) => ({ name, code, flag: "", dial }))
    .sort((a, b) => a.name.localeCompare(b.name)),
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

// Remove a leading "+<dialcode> " prefix so the national number can be re-prefixed.
export function stripLeadingDial(phone: string): string {
  return phone.replace(/^\s*\+\d{1,4}[\s-]*/, "").trim();
}

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
