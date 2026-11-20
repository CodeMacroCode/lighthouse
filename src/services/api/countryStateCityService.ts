/**
 * CountryStateCityAPI client
 * Connects to https://api.countrystatecity.in/v1 with fallback datasets
 */

export interface CountryItem {
  id?: number | string;
  name: string;
  iso2: string;
  iso3?: string;
  phonecode?: string;
  capital?: string;
  currency?: string;
  emoji?: string;
}

export interface StateItem {
  id?: number | string;
  name: string;
  iso2: string;
  country_code?: string;
}

export interface CityItem {
  id?: number | string;
  name: string;
  state_code?: string;
  country_code?: string;
}

// Built-in standard geographic dataset ensuring zero downtime and offline resilience
const FALLBACK_COUNTRIES: CountryItem[] = [
  { id: 101, name: "India", iso2: "IN", emoji: "🇮🇳" },
  { id: 233, name: "United States", iso2: "US", emoji: "🇺🇸" },
  { id: 232, name: "United Kingdom", iso2: "GB", emoji: "🇬🇧" },
  { id: 229, name: "United Arab Emirates", iso2: "AE", emoji: "🇦🇪" },
  { id: 13, name: "Australia", iso2: "AU", emoji: "🇦🇺" },
  { id: 38, name: "Canada", iso2: "CA", emoji: "🇨🇦" },
  { id: 196, name: "Singapore", iso2: "SG", emoji: "🇸🇬" },
  { id: 82, name: "Germany", iso2: "DE", emoji: "🇩🇪" },
];

const FALLBACK_INDIAN_STATES: StateItem[] = [
  { id: 4001, name: "Maharashtra", iso2: "MH", country_code: "IN" },
  { id: 4002, name: "Gujarat", iso2: "GJ", country_code: "IN" },
  { id: 4003, name: "Goa", iso2: "GA", country_code: "IN" },
  { id: 4004, name: "Karnataka", iso2: "KA", country_code: "IN" },
  { id: 4005, name: "Tamil Nadu", iso2: "TN", country_code: "IN" },
  { id: 4006, name: "Telangana", iso2: "TG", country_code: "IN" },
  { id: 4007, name: "Andhra Pradesh", iso2: "AP", country_code: "IN" },
  { id: 4008, name: "Delhi", iso2: "DL", country_code: "IN" },
  { id: 4009, name: "Punjab", iso2: "PB", country_code: "IN" },
  { id: 4010, name: "Haryana", iso2: "HR", country_code: "IN" },
  { id: 4011, name: "Rajasthan", iso2: "RJ", country_code: "IN" },
  { id: 4012, name: "Uttar Pradesh", iso2: "UP", country_code: "IN" },
  { id: 4013, name: "Madhya Pradesh", iso2: "MP", country_code: "IN" },
  { id: 4014, name: "West Bengal", iso2: "WB", country_code: "IN" },
  { id: 4015, name: "Odisha", iso2: "OR", country_code: "IN" },
  { id: 4016, name: "Bihar", iso2: "BR", country_code: "IN" },
  { id: 4017, name: "Kerala", iso2: "KL", country_code: "IN" },
  { id: 4018, name: "Assam", iso2: "AS", country_code: "IN" },
  { id: 4019, name: "Chhattisgarh", iso2: "CT", country_code: "IN" },
  { id: 4020, name: "Jharkhand", iso2: "JH", country_code: "IN" },
  { id: 4021, name: "Uttarakhand", iso2: "UT", country_code: "IN" },
  { id: 4022, name: "Himachal Pradesh", iso2: "HP", country_code: "IN" },
  { id: 4023, name: "Jammu and Kashmir", iso2: "JK", country_code: "IN" },
  { id: 4024, name: "Chandigarh", iso2: "CH", country_code: "IN" },
];

const FALLBACK_CITIES: Record<string, CityItem[]> = {
  MH: [
    { id: 5001, name: "Mumbai", state_code: "MH" },
    { id: 5002, name: "Pune", state_code: "MH" },
    { id: 5003, name: "Nagpur", state_code: "MH" },
    { id: 5004, name: "Thane", state_code: "MH" },
    { id: 5005, name: "Nashik", state_code: "MH" },
    { id: 5006, name: "Chhatrapati Sambhajinagar (Aurangabad)", state_code: "MH" },
    { id: 5007, name: "Navi Mumbai", state_code: "MH" },
    { id: 5008, name: "Solapur", state_code: "MH" },
    { id: 5009, name: "Kolhapur", state_code: "MH" },
    { id: 5010, name: "Amravati", state_code: "MH" },
    { id: 5011, name: "Nanded", state_code: "MH" },
    { id: 5012, name: "Sangli", state_code: "MH" },
    { id: 5013, name: "Jalgaon", state_code: "MH" },
    { id: 5014, name: "Akola", state_code: "MH" },
    { id: 5015, name: "Latur", state_code: "MH" },
    { id: 5016, name: "Dhule", state_code: "MH" },
    { id: 5017, name: "Ahmednagar", state_code: "MH" },
    { id: 5018, name: "Chandrapur", state_code: "MH" },
    { id: 5019, name: "Satara", state_code: "MH" },
    { id: 5020, name: "Ratnagiri", state_code: "MH" },
  ],
  GJ: [
    { id: 5030, name: "Ahmedabad", state_code: "GJ" },
    { id: 5031, name: "Surat", state_code: "GJ" },
    { id: 5032, name: "Vadodara", state_code: "GJ" },
    { id: 5033, name: "Rajkot", state_code: "GJ" },
    { id: 5034, name: "Bhavnagar", state_code: "GJ" },
    { id: 5035, name: "Jamnagar", state_code: "GJ" },
    { id: 5036, name: "Junagadh", state_code: "GJ" },
    { id: 5037, name: "Gandhinagar", state_code: "GJ" },
    { id: 5038, name: "Anand", state_code: "GJ" },
    { id: 5039, name: "Navsari", state_code: "GJ" },
    { id: 5040, name: "Morbi", state_code: "GJ" },
    { id: 5041, name: "Bharuch", state_code: "GJ" },
    { id: 5042, name: "Vapi", state_code: "GJ" },
    { id: 5043, name: "Bhuj", state_code: "GJ" },
  ],
  GA: [
    { id: 5050, name: "Panaji", state_code: "GA" },
    { id: 5051, name: "Margao", state_code: "GA" },
    { id: 5052, name: "Vasco da Gama", state_code: "GA" },
    { id: 5053, name: "Mapusa", state_code: "GA" },
    { id: 5054, name: "Ponda", state_code: "GA" },
    { id: 5055, name: "Bicholim", state_code: "GA" },
    { id: 5056, name: "Curchorem", state_code: "GA" },
    { id: 5057, name: "Cuncolim", state_code: "GA" },
    { id: 5058, name: "Pernem", state_code: "GA" },
    { id: 5059, name: "Canacona", state_code: "GA" },
  ],
  DL: [
    { id: 5060, name: "New Delhi", state_code: "DL" },
    { id: 5061, name: "Central Delhi", state_code: "DL" },
    { id: 5062, name: "North Delhi", state_code: "DL" },
    { id: 5063, name: "South Delhi", state_code: "DL" },
    { id: 5064, name: "East Delhi", state_code: "DL" },
    { id: 5065, name: "West Delhi", state_code: "DL" },
    { id: 5066, name: "Dwarka", state_code: "DL" },
    { id: 5067, name: "Rohini", state_code: "DL" },
    { id: 5068, name: "Connaught Place", state_code: "DL" },
    { id: 5069, name: "Saket", state_code: "DL" },
  ],
  KA: [
    { id: 5070, name: "Bengaluru", state_code: "KA" },
    { id: 5071, name: "Mysuru", state_code: "KA" },
    { id: 5072, name: "Hubli-Dharwad", state_code: "KA" },
    { id: 5073, name: "Mangalore", state_code: "KA" },
    { id: 5074, name: "Belgaum", state_code: "KA" },
    { id: 5075, name: "Gulbarga (Kalaburagi)", state_code: "KA" },
    { id: 5076, name: "Davanagere", state_code: "KA" },
    { id: 5077, name: "Bellary", state_code: "KA" },
    { id: 5078, name: "Shimoga", state_code: "KA" },
    { id: 5079, name: "Tumkur", state_code: "KA" },
    { id: 5080, name: "Udupi", state_code: "KA" },
    { id: 5081, name: "Hassan", state_code: "KA" },
  ],
  TN: [
    { id: 5090, name: "Chennai", state_code: "TN" },
    { id: 5091, name: "Coimbatore", state_code: "TN" },
    { id: 5092, name: "Madurai", state_code: "TN" },
    { id: 5093, name: "Tiruchirappalli", state_code: "TN" },
    { id: 5094, name: "Salem", state_code: "TN" },
    { id: 5095, name: "Tiruppur", state_code: "TN" },
    { id: 5096, name: "Erode", state_code: "TN" },
    { id: 5097, name: "Tirunelveli", state_code: "TN" },
    { id: 5098, name: "Vellore", state_code: "TN" },
    { id: 5099, name: "Thoothukudi", state_code: "TN" },
    { id: 5100, name: "Thanjavur", state_code: "TN" },
    { id: 5101, name: "Kanchipuram", state_code: "TN" },
    { id: 5102, name: "Ooty", state_code: "TN" },
  ],
  TG: [
    { id: 5110, name: "Hyderabad", state_code: "TG" },
    { id: 5111, name: "Warangal", state_code: "TG" },
    { id: 5112, name: "Nizamabad", state_code: "TG" },
    { id: 5113, name: "Karimnagar", state_code: "TG" },
    { id: 5114, name: "Ramagundam", state_code: "TG" },
    { id: 5115, name: "Khammam", state_code: "TG" },
    { id: 5116, name: "Mahbubnagar", state_code: "TG" },
    { id: 5117, name: "Nalgonda", state_code: "TG" },
    { id: 5118, name: "Siddipet", state_code: "TG" },
  ],
  AP: [
    { id: 5120, name: "Visakhapatnam", state_code: "AP" },
    { id: 5121, name: "Vijayawada", state_code: "AP" },
    { id: 5122, name: "Guntur", state_code: "AP" },
    { id: 5123, name: "Nellore", state_code: "AP" },
    { id: 5124, name: "Kurnool", state_code: "AP" },
    { id: 5125, name: "Kakinada", state_code: "AP" },
    { id: 5126, name: "Rajahmundry", state_code: "AP" },
    { id: 5127, name: "Tirupati", state_code: "AP" },
    { id: 5128, name: "Kadapa", state_code: "AP" },
    { id: 5129, name: "Anantapur", state_code: "AP" },
  ],
  WB: [
    { id: 5130, name: "Kolkata", state_code: "WB" },
    { id: 5131, name: "Howrah", state_code: "WB" },
    { id: 5132, name: "Asansol", state_code: "WB" },
    { id: 5133, name: "Siliguri", state_code: "WB" },
    { id: 5134, name: "Durgapur", state_code: "WB" },
    { id: 5135, name: "Bardhaman", state_code: "WB" },
    { id: 5136, name: "Malda", state_code: "WB" },
    { id: 5137, name: "Kharagpur", state_code: "WB" },
    { id: 5138, name: "Darjeeling", state_code: "WB" },
  ],
  UP: [
    { id: 5140, name: "Lucknow", state_code: "UP" },
    { id: 5141, name: "Kanpur", state_code: "UP" },
    { id: 5142, name: "Ghaziabad", state_code: "UP" },
    { id: 5143, name: "Agra", state_code: "UP" },
    { id: 5144, name: "Meerut", state_code: "UP" },
    { id: 5145, name: "Varanasi", state_code: "UP" },
    { id: 5146, name: "Prayagraj (Allahabad)", state_code: "UP" },
    { id: 5147, name: "Noida", state_code: "UP" },
    { id: 5148, name: "Greater Noida", state_code: "UP" },
    { id: 5149, name: "Bareilly", state_code: "UP" },
    { id: 5150, name: "Aligarh", state_code: "UP" },
    { id: 5151, name: "Moradabad", state_code: "UP" },
    { id: 5152, name: "Gorakhpur", state_code: "UP" },
    { id: 5153, name: "Ayodhya", state_code: "UP" },
    { id: 5154, name: "Mathura", state_code: "UP" },
    { id: 5155, name: "Jhansi", state_code: "UP" },
  ],
  RJ: [
    { id: 5160, name: "Jaipur", state_code: "RJ" },
    { id: 5161, name: "Jodhpur", state_code: "RJ" },
    { id: 5162, name: "Kota", state_code: "RJ" },
    { id: 5163, name: "Bikaner", state_code: "RJ" },
    { id: 5164, name: "Ajmer", state_code: "RJ" },
    { id: 5165, name: "Udaipur", state_code: "RJ" },
    { id: 5166, name: "Bhilwara", state_code: "RJ" },
    { id: 5167, name: "Alwar", state_code: "RJ" },
    { id: 5168, name: "Bharatpur", state_code: "RJ" },
    { id: 5169, name: "Sikar", state_code: "RJ" },
  ],
  MP: [
    { id: 5170, name: "Bhopal", state_code: "MP" },
    { id: 5171, name: "Indore", state_code: "MP" },
    { id: 5172, name: "Jabalpur", state_code: "MP" },
    { id: 5173, name: "Gwalior", state_code: "MP" },
    { id: 5174, name: "Ujjain", state_code: "MP" },
    { id: 5175, name: "Sagar", state_code: "MP" },
    { id: 5176, name: "Dewas", state_code: "MP" },
    { id: 5177, name: "Satna", state_code: "MP" },
    { id: 5178, name: "Ratlam", state_code: "MP" },
    { id: 5179, name: "Rewa", state_code: "MP" },
  ],
  PB: [
    { id: 5180, name: "Ludhiana", state_code: "PB" },
    { id: 5181, name: "Amritsar", state_code: "PB" },
    { id: 5182, name: "Jalandhar", state_code: "PB" },
    { id: 5183, name: "Patiala", state_code: "PB" },
    { id: 5184, name: "Bathinda", state_code: "PB" },
    { id: 5185, name: "Mohali (SAS Nagar)", state_code: "PB" },
    { id: 5186, name: "Hoshiarpur", state_code: "PB" },
    { id: 5187, name: "Pathankot", state_code: "PB" },
  ],
  HR: [
    { id: 5190, name: "Gurugram", state_code: "HR" },
    { id: 5191, name: "Faridabad", state_code: "HR" },
    { id: 5192, name: "Panipat", state_code: "HR" },
    { id: 5193, name: "Ambala", state_code: "HR" },
    { id: 5194, name: "Yamunanagar", state_code: "HR" },
    { id: 5195, name: "Rohtak", state_code: "HR" },
    { id: 5196, name: "Hisar", state_code: "HR" },
    { id: 5197, name: "Karnal", state_code: "HR" },
    { id: 5198, name: "Sonipat", state_code: "HR" },
    { id: 5199, name: "Panchkula", state_code: "HR" },
  ],
  KL: [
    { id: 5200, name: "Thiruvananthapuram", state_code: "KL" },
    { id: 5201, name: "Kochi", state_code: "KL" },
    { id: 5202, name: "Kozhikode", state_code: "KL" },
    { id: 5203, name: "Kollam", state_code: "KL" },
    { id: 5204, name: "Thrissur", state_code: "KL" },
    { id: 5205, name: "Kannur", state_code: "KL" },
    { id: 5206, name: "Alappuzha", state_code: "KL" },
    { id: 5207, name: "Kottayam", state_code: "KL" },
    { id: 5208, name: "Palakkad", state_code: "KL" },
  ],
  BR: [
    { id: 5210, name: "Patna", state_code: "BR" },
    { id: 5211, name: "Gaya", state_code: "BR" },
    { id: 5212, name: "Bhagalpur", state_code: "BR" },
    { id: 5213, name: "Muzaffarpur", state_code: "BR" },
    { id: 5214, name: "Purnia", state_code: "BR" },
    { id: 5215, name: "Darbhanga", state_code: "BR" },
    { id: 5216, name: "Bihar Sharif", state_code: "BR" },
    { id: 5217, name: "Arrah", state_code: "BR" },
    { id: 5218, name: "Begusarai", state_code: "BR" },
  ],
  OR: [
    { id: 5220, name: "Bhubaneswar", state_code: "OR" },
    { id: 5221, name: "Cuttack", state_code: "OR" },
    { id: 5222, name: "Rourkela", state_code: "OR" },
    { id: 5223, name: "Berhampur", state_code: "OR" },
    { id: 5224, name: "Sambalpur", state_code: "OR" },
    { id: 5225, name: "Puri", state_code: "OR" },
    { id: 5226, name: "Balasore", state_code: "OR" },
  ],
  AS: [
    { id: 5230, name: "Guwahati", state_code: "AS" },
    { id: 5231, name: "Silchar", state_code: "AS" },
    { id: 5232, name: "Dibrugarh", state_code: "AS" },
    { id: 5233, name: "Jorhat", state_code: "AS" },
    { id: 5234, name: "Nagaon", state_code: "AS" },
    { id: 5235, name: "Tezpur", state_code: "AS" },
  ],
  CT: [
    { id: 5240, name: "Raipur", state_code: "CT" },
    { id: 5241, name: "Bhilai", state_code: "CT" },
    { id: 5242, name: "Bilaspur", state_code: "CT" },
    { id: 5243, name: "Korba", state_code: "CT" },
    { id: 5244, name: "Durg", state_code: "CT" },
  ],
  JH: [
    { id: 5250, name: "Ranchi", state_code: "JH" },
    { id: 5251, name: "Jamshedpur", state_code: "JH" },
    { id: 5252, name: "Dhanbad", state_code: "JH" },
    { id: 5253, name: "Bokaro Steel City", state_code: "JH" },
    { id: 5254, name: "Deoghar", state_code: "JH" },
    { id: 5255, name: "Hazaribagh", state_code: "JH" },
  ],
  UT: [
    { id: 5260, name: "Dehradun", state_code: "UT" },
    { id: 5261, name: "Haridwar", state_code: "UT" },
    { id: 5262, name: "Roorkee", state_code: "UT" },
    { id: 5263, name: "Haldwani", state_code: "UT" },
    { id: 5264, name: "Rishikesh", state_code: "UT" },
    { id: 5265, name: "Nainital", state_code: "UT" },
  ],
  HP: [
    { id: 5270, name: "Shimla", state_code: "HP" },
    { id: 5271, name: "Dharamshala", state_code: "HP" },
    { id: 5272, name: "Solan", state_code: "HP" },
    { id: 5273, name: "Mandi", state_code: "HP" },
    { id: 5274, name: "Kullu-Manali", state_code: "HP" },
    { id: 5275, name: "Baddi", state_code: "HP" },
  ],
  JK: [
    { id: 5280, name: "Srinagar", state_code: "JK" },
    { id: 5281, name: "Jammu", state_code: "JK" },
    { id: 5282, name: "Anantnag", state_code: "JK" },
    { id: 5283, name: "Baramulla", state_code: "JK" },
    { id: 5284, name: "Udhampur", state_code: "JK" },
  ],
  CH: [
    { id: 5290, name: "Chandigarh", state_code: "CH" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Layer Caching & Request Deduplication
// Layer 1: In-Memory Map (0ms, zero network calls during session)
// Layer 2: LocalStorage Persistent Cache (7-day TTL, avoids calls across reloads)
// Layer 3: In-Flight Request Deduplication (prevents duplicate simultaneous HTTP requests)
// ─────────────────────────────────────────────────────────────────────────────

const memoryCache = {
  countries: null as CountryItem[] | null,
  states: new Map<string, StateItem[]>(),
  cities: new Map<string, CityItem[]>(),
};

const inFlightRequests = new Map<string, Promise<any>>();

function deduplicateRequest<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }
  const promise = fetchFn().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function safeStorageGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || typeof parsed.timestamp !== "number") return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.data as T;
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: any): void {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      timestamp: Date.now(),
      data: value,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Quota exceeded or private browsing mode - silently pass
  }
}

export class CountryStateCityAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ||
      (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_CSC_API_KEY || "" : "");
    this.baseUrl = "https://api.countrystatecity.in/v1";
  }

  /**
   * Fetch all countries with multi-layer caching
   */
  async getCountries(): Promise<CountryItem[]> {
    // 1. In-memory check
    if (memoryCache.countries && memoryCache.countries.length > 0) {
      return memoryCache.countries;
    }

    // 2. Persistent storage check
    const stored = safeStorageGet<CountryItem[]>("csc_cache_v1_countries");
    if (stored && stored.length > 0) {
      memoryCache.countries = stored;
      return stored;
    }

    // 3. Live API with deduplication (if API key available)
    if (this.apiKey) {
      return deduplicateRequest("countries", async () => {
        try {
          const res = await fetch(`${this.baseUrl}/countries`, {
            headers: {
              "X-CSCAPI-KEY": this.apiKey,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              memoryCache.countries = data;
              safeStorageSet("csc_cache_v1_countries", data);
              return data;
            }
          }
        } catch (err) {
          console.warn("CountryStateCityAPI getCountries error, falling back:", err);
        }
        return FALLBACK_COUNTRIES;
      });
    }

    // 4. Zero-network fallback
    return FALLBACK_COUNTRIES;
  }

  /**
   * Fetch all states for a specific country ISO2 with multi-layer caching
   */
  async getStates(countryIso2: string): Promise<StateItem[]> {
    if (!countryIso2) return [];
    const code = countryIso2.trim().toUpperCase();

    // 1. In-memory check
    if (memoryCache.states.has(code)) {
      return memoryCache.states.get(code)!;
    }

    // 2. Persistent storage check
    const storageKey = `csc_cache_v1_states_${code}`;
    const stored = safeStorageGet<StateItem[]>(storageKey);
    if (stored && stored.length > 0) {
      memoryCache.states.set(code, stored);
      return stored;
    }

    // 3. Live API with deduplication (if API key available)
    if (this.apiKey) {
      return deduplicateRequest(`states_${code}`, async () => {
        try {
          const res = await fetch(`${this.baseUrl}/countries/${code}/states`, {
            headers: {
              "X-CSCAPI-KEY": this.apiKey,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              memoryCache.states.set(code, data);
              safeStorageSet(storageKey, data);
              return data;
            }
          }
        } catch (err) {
          console.warn(`CountryStateCityAPI getStates(${code}) error, falling back:`, err);
        }
        return code === "IN" ? FALLBACK_INDIAN_STATES : [];
      });
    }

    // 4. Zero-network fallback
    if (code === "IN") {
      return FALLBACK_INDIAN_STATES;
    }

    return [];
  }

  /**
   * Fetch all cities for a specific state in a country with multi-layer caching
   */
  async getCities(countryIso2: string, stateIso2: string): Promise<CityItem[]> {
    if (!countryIso2 || !stateIso2) return [];
    const cCode = countryIso2.trim().toUpperCase();
    const sCode = stateIso2.trim().toUpperCase();
    const cacheKey = `${cCode}_${sCode}`;

    // 1. In-memory check
    if (memoryCache.cities.has(cacheKey)) {
      return memoryCache.cities.get(cacheKey)!;
    }

    // 2. Persistent storage check
    const storageKey = `csc_cache_v1_cities_${cacheKey}`;
    const stored = safeStorageGet<CityItem[]>(storageKey);
    if (stored && stored.length > 0) {
      memoryCache.cities.set(cacheKey, stored);
      return stored;
    }

    // 3. Live API with deduplication (if API key available)
    if (this.apiKey) {
      return deduplicateRequest(`cities_${cacheKey}`, async () => {
        try {
          const res = await fetch(
            `${this.baseUrl}/countries/${cCode}/states/${sCode}/cities`,
            {
              headers: {
                "X-CSCAPI-KEY": this.apiKey,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              memoryCache.cities.set(cacheKey, data);
              safeStorageSet(storageKey, data);
              return data;
            }
          }
        } catch (err) {
          console.warn(
            `CountryStateCityAPI getCities(${cCode}, ${sCode}) error, falling back:`,
            err
          );
        }
        return FALLBACK_CITIES[sCode] || [];
      });
    }

    // 4. Zero-network fallback
    if (FALLBACK_CITIES[sCode]) {
      return FALLBACK_CITIES[sCode];
    }

    return [];
  }
}

export { FALLBACK_INDIAN_STATES, FALLBACK_CITIES };

/**
 * Helper to resolve the parent state for a given city name
 */
export const findStateForCity = (cityName: string): string | undefined => {
  if (!cityName) return undefined;
  const cleanCity = cityName.trim().toLowerCase();
  for (const [stateCode, cities] of Object.entries(FALLBACK_CITIES)) {
    const found = cities.find(
      (c) => c.name.toLowerCase() === cleanCity || c.name.toLowerCase().includes(cleanCity)
    );
    if (found) {
      const stateObj = FALLBACK_INDIAN_STATES.find((s) => s.iso2 === stateCode);
      if (stateObj) return stateObj.name;
    }
  }
  return undefined;
};

/**
 * Helper to fetch all cities for a given Indian state name or ISO code using CountryStateCityAPI with offline fallback
 */
export const getCitiesForState = async (stateNameOrIso: string): Promise<string[]> => {
  if (!stateNameOrIso) return [];
  const stateObj = FALLBACK_INDIAN_STATES.find(
    (s) =>
      s.name.toLowerCase() === stateNameOrIso.toLowerCase() ||
      s.iso2.toLowerCase() === stateNameOrIso.toLowerCase()
  );
  const code = stateObj?.iso2 || stateNameOrIso;
  const api = new CountryStateCityAPI();
  try {
    const list = await api.getCities("IN", code);
    if (Array.isArray(list) && list.length > 0) {
      return Array.from(new Set(list.map((c) => c.name))).sort();
    }
  } catch (err) {
    console.warn("getCitiesForState fallback triggered:", err);
  }
  if (FALLBACK_CITIES[code]) {
    return FALLBACK_CITIES[code].map((c) => c.name).sort();
  }
  return [];
};
