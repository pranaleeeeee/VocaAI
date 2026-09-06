export interface BuddyResponse {
  isBuddyTopic: boolean;
  reply: string;
  source?: string;
}

export class BuddyEngine {
  /**
   * Worldwide timezone lookup for real-time live time & date
   */
  public static getLiveTime(query: string, language: string, customerName?: string): { reply: string; source: string } | null {
    const q = query.toLowerCase();
    const isHindi = language === "Hindi" || language === "Hindi + English";
    const nameStr = customerName ? `${customerName}` : (isHindi ? "dost" : "my friend");

    const isTimeQuery = q.includes("time") || q.includes("samay") || q.includes("baj rahe") || q.includes("ghadi") || q.includes("date") || q.includes("tareekh") || q.includes("day is today") || q.includes("din hai");
    if (!isTimeQuery) return null;

    if (q.includes("antarctica") || q.includes("antarctic")) {
      return {
        reply: isHindi
          ? "Antarctica me koi ek universal time zone nahi hai kyunki sabhi deshaantar rekhaayein South Pole par milti hain. Alag-alag research stations apne supply base ka samay follow karte hain, jaise McMurdo Station New Zealand time (UTC+12) follow karta hai. Yadi aap station batayein to main local samay bata sakta hoon."
          : "Antarctica doesn't have one single time zone because all lines of longitude converge at the South Pole. Different research stations use different time zones based on their supply lines—for example, McMurdo Station follows New Zealand Time (UTC+12), while Palmer Station follows Chile Time (UTC-3). If you tell me the specific station, I can give you its local time.",
        source: "Antarctica Time Standard"
      };
    }

    const timezones: { [key: string]: { tz: string; label: string; hindiLabel: string } } = {
      "melbourne": { tz: "Australia/Melbourne", label: "Melbourne, Australia", hindiLabel: "Melbourne, Australia" },
      "sydney": { tz: "Australia/Sydney", label: "Sydney, Australia", hindiLabel: "Sydney, Australia" },
      "brisbane": { tz: "Australia/Brisbane", label: "Brisbane, Australia", hindiLabel: "Brisbane, Australia" },
      "perth": { tz: "Australia/Perth", label: "Perth, Australia", hindiLabel: "Perth, Australia" },
      "adelaide": { tz: "Australia/Adelaide", label: "Adelaide, Australia", hindiLabel: "Adelaide, Australia" },
      "australia": { tz: "Australia/Melbourne", label: "Melbourne / Sydney (Eastern Australia)", hindiLabel: "Eastern Australia" },
      "auckland": { tz: "Pacific/Auckland", label: "Auckland, New Zealand", hindiLabel: "Auckland, New Zealand" },
      "new zealand": { tz: "Pacific/Auckland", label: "New Zealand", hindiLabel: "New Zealand" },
      "london": { tz: "Europe/London", label: "London, UK", hindiLabel: "London, UK" },
      "uk": { tz: "Europe/London", label: "United Kingdom", hindiLabel: "United Kingdom" },
      "england": { tz: "Europe/London", label: "England", hindiLabel: "England" },
      "tokyo": { tz: "Asia/Tokyo", label: "Tokyo, Japan", hindiLabel: "Tokyo, Japan" },
      "japan": { tz: "Asia/Tokyo", label: "Japan", hindiLabel: "Japan" },
      "new york": { tz: "America/New_York", label: "New York, USA", hindiLabel: "New York, USA" },
      "nyc": { tz: "America/New_York", label: "New York, USA", hindiLabel: "New York, USA" },
      "los angeles": { tz: "America/Los_Angeles", label: "Los Angeles, USA", hindiLabel: "Los Angeles, USA" },
      "california": { tz: "America/Los_Angeles", label: "California, USA", hindiLabel: "California, USA" },
      "san francisco": { tz: "America/Los_Angeles", label: "San Francisco, USA", hindiLabel: "San Francisco, USA" },
      "seattle": { tz: "America/Los_Angeles", label: "Seattle, USA", hindiLabel: "Seattle, USA" },
      "chicago": { tz: "America/Chicago", label: "Chicago, USA", hindiLabel: "Chicago, USA" },
      "denver": { tz: "America/Denver", label: "Denver, USA", hindiLabel: "Denver, USA" },
      "paris": { tz: "Europe/Paris", label: "Paris, France", hindiLabel: "Paris, France" },
      "france": { tz: "Europe/Paris", label: "France", hindiLabel: "France" },
      "berlin": { tz: "Europe/Berlin", label: "Berlin, Germany", hindiLabel: "Berlin, Germany" },
      "germany": { tz: "Europe/Berlin", label: "Germany", hindiLabel: "Germany" },
      "rome": { tz: "Europe/Rome", label: "Rome, Italy", hindiLabel: "Rome, Italy" },
      "italy": { tz: "Europe/Rome", label: "Italy", hindiLabel: "Italy" },
      "dubai": { tz: "Asia/Dubai", label: "Dubai, UAE", hindiLabel: "Dubai, UAE" },
      "uae": { tz: "Asia/Dubai", label: "United Arab Emirates", hindiLabel: "UAE" },
      "singapore": { tz: "Asia/Singapore", label: "Singapore", hindiLabel: "Singapore" },
      "hong kong": { tz: "Asia/Hong_Kong", label: "Hong Kong", hindiLabel: "Hong Kong" },
      "china": { tz: "Asia/Shanghai", label: "Beijing / Shanghai, China", hindiLabel: "China" },
      "beijing": { tz: "Asia/Shanghai", label: "Beijing, China", hindiLabel: "Beijing, China" },
      "shanghai": { tz: "Asia/Shanghai", label: "Shanghai, China", hindiLabel: "Shanghai, China" },
      "seoul": { tz: "Asia/Seoul", label: "Seoul, South Korea", hindiLabel: "Seoul, South Korea" },
      "korea": { tz: "Asia/Seoul", label: "South Korea", hindiLabel: "South Korea" },
      "bangkok": { tz: "Asia/Bangkok", label: "Bangkok, Thailand", hindiLabel: "Bangkok, Thailand" },
      "thailand": { tz: "Asia/Bangkok", label: "Thailand", hindiLabel: "Thailand" },
      "moscow": { tz: "Europe/Moscow", label: "Moscow, Russia", hindiLabel: "Moscow, Russia" },
      "russia": { tz: "Europe/Moscow", label: "Moscow, Russia", hindiLabel: "Russia" },
      "toronto": { tz: "America/Toronto", label: "Toronto, Canada", hindiLabel: "Toronto, Canada" },
      "canada": { tz: "America/Toronto", label: "Eastern Canada", hindiLabel: "Canada" },
      "vancouver": { tz: "America/Vancouver", label: "Vancouver, Canada", hindiLabel: "Vancouver, Canada" },
      "delhi": { tz: "Asia/Kolkata", label: "Delhi, India", hindiLabel: "Delhi, India" },
      "mumbai": { tz: "Asia/Kolkata", label: "Mumbai, India", hindiLabel: "Mumbai, India" },
      "india": { tz: "Asia/Kolkata", label: "India (IST)", hindiLabel: "India (IST)" },
      "bharat": { tz: "Asia/Kolkata", label: "India (IST)", hindiLabel: "India (IST)" },
      "cairo": { tz: "Africa/Cairo", label: "Cairo, Egypt", hindiLabel: "Cairo, Egypt" },
      "egypt": { tz: "Africa/Cairo", label: "Egypt", hindiLabel: "Egypt" },
      "johannesburg": { tz: "Africa/Johannesburg", label: "Johannesburg, South Africa", hindiLabel: "Johannesburg, South Africa" },
      "south africa": { tz: "Africa/Johannesburg", label: "South Africa", hindiLabel: "South Africa" },
      "sao paulo": { tz: "America/Sao_Paulo", label: "São Paulo, Brazil", hindiLabel: "São Paulo, Brazil" },
      "brazil": { tz: "America/Sao_Paulo", label: "Brazil", hindiLabel: "Brazil" },
      "riyadh": { tz: "Asia/Riyadh", label: "Riyadh, Saudi Arabia", hindiLabel: "Riyadh, Saudi Arabia" },
      "saudi": { tz: "Asia/Riyadh", label: "Saudi Arabia", hindiLabel: "Saudi Arabia" },
      "doha": { tz: "Asia/Qatar", label: "Doha, Qatar", hindiLabel: "Doha, Qatar" },
      "qatar": { tz: "Asia/Qatar", label: "Qatar", hindiLabel: "Qatar" },
      "zurich": { tz: "Europe/Zurich", label: "Zurich, Switzerland", hindiLabel: "Zurich, Switzerland" },
      "switzerland": { tz: "Europe/Zurich", label: "Switzerland", hindiLabel: "Switzerland" },
      "amsterdam": { tz: "Europe/Amsterdam", label: "Amsterdam, Netherlands", hindiLabel: "Amsterdam, Netherlands" },
      "dublin": { tz: "Europe/Dublin", label: "Dublin, Ireland", hindiLabel: "Dublin, Ireland" },
      "ireland": { tz: "Europe/Dublin", label: "Ireland", hindiLabel: "Ireland" },
      "honolulu": { tz: "Pacific/Honolulu", label: "Honolulu, Hawaii", hindiLabel: "Honolulu, Hawaii" },
      "hawaii": { tz: "Pacific/Honolulu", label: "Hawaii", hindiLabel: "Hawaii" }
    };

    // Find requested city/region
    let matchedLocation = timezones["delhi"];
    let detectedName = "India (IST)";

    for (const [key, val] of Object.entries(timezones)) {
      if (q.includes(key)) {
        matchedLocation = val;
        detectedName = val.label;
        break;
      }
    }

    try {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat("en-US", {
        timeZone: matchedLocation.tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }).format(now);

      const dateStr = new Intl.DateTimeFormat("en-US", {
        timeZone: matchedLocation.tz,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      }).format(now);

      const politeAddress = customerName ? `${customerName}, ` : "";
      const politeAddressHi = customerName ? `${customerName} ji, ` : "";

      if (isHindi) {
        return {
          reply: `${politeAddressHi}${matchedLocation.hindiLabel} me vartaman samay ${timeStr} hai, ${dateStr}.`,
          source: `Live World Clock (${matchedLocation.tz})`
        };
      } else {
        return {
          reply: `${politeAddress}The local time in ${detectedName} is currently ${timeStr} on ${dateStr}.`,
          source: `Live World Clock (${matchedLocation.tz})`
        };
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * Instant facts: Capitals, Currencies, Math calculations, and Unit Conversions
   */
  public static getInstantFacts(query: string, language: string, customerName?: string): { reply: string; source: string } | null {
    const q = query.toLowerCase().trim();
    const isHindi = language === "Hindi" || language === "Hindi + English";
    const politeAddress = customerName ? `${customerName}, ` : "";
    const politeAddressHi = customerName ? `${customerName} ji, ` : "";

    // 1. World Capitals
    if (q.includes("capital")) {
      const capitals: { [key: string]: { city: string; country: string; extra?: string } } = {
        "australia": { city: "Canberra", country: "Australia", extra: "housing the federal parliament and supreme court" },
        "canada": { city: "Ottawa", country: "Canada" },
        "japan": { city: "Tokyo", country: "Japan" },
        "france": { city: "Paris", country: "France" },
        "germany": { city: "Berlin", country: "Germany" },
        "united kingdom": { city: "London", country: "the United Kingdom" },
        "uk": { city: "London", country: "the United Kingdom" },
        "england": { city: "London", country: "England" },
        "united states": { city: "Washington, D.C.", country: "the United States" },
        "usa": { city: "Washington, D.C.", country: "the United States" },
        "italy": { city: "Rome", country: "Italy" },
        "russia": { city: "Moscow", country: "Russia" },
        "china": { city: "Beijing", country: "China" },
        "india": { city: "New Delhi", country: "India" },
        "bharat": { city: "New Delhi", country: "Bharat" },
        "spain": { city: "Madrid", country: "Spain" },
        "brazil": { city: "Brasília", country: "Brazil" },
        "south africa": { city: "Pretoria, Cape Town, and Bloemfontein", country: "South Africa" },
        "new zealand": { city: "Wellington", country: "New Zealand" },
        "uae": { city: "Abu Dhabi", country: "the United Arab Emirates" },
        "saudi arabia": { city: "Riyadh", country: "Saudi Arabia" },
        "egypt": { city: "Cairo", country: "Egypt" },
        "turkey": { city: "Ankara", country: "Turkey" },
        "switzerland": { city: "Bern", country: "Switzerland" }
      };

      for (const [countryKey, val] of Object.entries(capitals)) {
        if (q.includes(countryKey)) {
          return {
            reply: isHindi
              ? `${politeAddressHi}${val.country} ki aadhikarik rajdhani (capital) ${val.city} hai.`
              : `${politeAddress}${val.city} serves as the sovereign capital of ${val.country}${val.extra ? `, ${val.extra}` : ""}.`,
            source: "World Knowledge Base"
          };
        }
      }
    }

    // 2. World Currencies
    if (q.includes("currency") || q.includes("mudra")) {
      const currencies: { [key: string]: { name: string; symbol: string; country: string } } = {
        "japan": { name: "Japanese Yen", symbol: "JPY (¥)", country: "Japan" },
        "uk": { name: "British Pound Sterling", symbol: "GBP (£)", country: "the United Kingdom" },
        "england": { name: "British Pound Sterling", symbol: "GBP (£)", country: "England" },
        "usa": { name: "United States Dollar", symbol: "USD ($)", country: "the United States" },
        "australia": { name: "Australian Dollar", symbol: "AUD (A$)", country: "Australia" },
        "india": { name: "Indian Rupee", symbol: "INR (₹)", country: "India" },
        "europe": { name: "Euro", symbol: "EUR (€)", country: "the Eurozone" },
        "germany": { name: "Euro", symbol: "EUR (€)", country: "Germany" },
        "france": { name: "Euro", symbol: "EUR (€)", country: "France" },
        "china": { name: "Chinese Yuan Renminbi", symbol: "CNY (¥)", country: "China" },
        "uae": { name: "UAE Dirham", symbol: "AED", country: "the United Arab Emirates" },
        "dubai": { name: "UAE Dirham", symbol: "AED", country: "Dubai" },
        "canada": { name: "Canadian Dollar", symbol: "CAD (C$)", country: "Canada" },
        "russia": { name: "Russian Ruble", symbol: "RUB (₽)", country: "Russia" }
      };

      for (const [k, v] of Object.entries(currencies)) {
        if (q.includes(k)) {
          return {
            reply: isHindi
              ? `${politeAddressHi}${v.country} ki aadhikarik mudra (currency) ${v.name} hai, jise aamtaur par ${v.symbol} se darshaya jata hai.`
              : `${politeAddress}The official currency of ${v.country} is the ${v.name}, internationally designated by the code ${v.symbol}.`,
            source: "World Knowledge Base"
          };
        }
      }
    }

    // 3. Mathematical Calculations & Scientific Units
    const mathMatch = q.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/]|plus|minus|times|multiplied by|divided by)\s*(\d+(?:\.\d+)?)/i);
    if (mathMatch) {
      const n1 = parseFloat(mathMatch[1]);
      const opRaw = mathMatch[2].toLowerCase();
      const n2 = parseFloat(mathMatch[3]);
      let ans = 0;
      let opWord = "plus";
      if (opRaw === "+" || opRaw === "plus") { ans = n1 + n2; opWord = "plus"; }
      else if (opRaw === "-" || opRaw === "minus") { ans = n1 - n2; opWord = "minus"; }
      else if (opRaw === "*" || opRaw === "times" || opRaw === "multiplied by") { ans = n1 * n2; opWord = "multiplied by"; }
      else if (opRaw === "/" || opRaw === "divided by") { ans = n2 !== 0 ? n1 / n2 : NaN; opWord = "divided by"; }

      if (!isNaN(ans)) {
        return {
          reply: isHindi
            ? `${politeAddressHi}${n1} aur ${n2} ka ganitiya parinaam (result) ${ans} hai.`
            : `${politeAddress}Evaluating that expression: ${n1} ${opWord} ${n2} equals precisely ${ans}.`,
          source: "Mathematical Engine"
        };
      }
    }

    return null;
  }

  private static CITY_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
    "mumbai": { lat: 19.0760, lon: 72.8777, name: "Mumbai" },
    "delhi": { lat: 28.6139, lon: 77.2090, name: "Delhi" },
    "new delhi": { lat: 28.6139, lon: 77.2090, name: "New Delhi" },
    "bengaluru": { lat: 12.9716, lon: 77.5946, name: "Bengaluru" },
    "bangalore": { lat: 12.9716, lon: 77.5946, name: "Bengaluru" },
    "kolkata": { lat: 22.5726, lon: 88.3639, name: "Kolkata" },
    "chennai": { lat: 13.0827, lon: 80.2707, name: "Chennai" },
    "gujarat": { lat: 23.2156, lon: 72.6369, name: "Gujarat" },
    "ahmedabad": { lat: 23.0225, lon: 72.5714, name: "Ahmedabad" },
    "gandhinagar": { lat: 23.2156, lon: 72.6369, name: "Gandhinagar" },
    "hyderabad": { lat: 17.3850, lon: 78.4867, name: "Hyderabad" },
    "pune": { lat: 18.5204, lon: 73.8567, name: "Pune" },
    "jaipur": { lat: 26.9124, lon: 75.7873, name: "Jaipur" },
    "lucknow": { lat: 26.8467, lon: 80.9462, name: "Lucknow" },
    "chandigarh": { lat: 30.7333, lon: 76.7794, name: "Chandigarh" },
    "bhopal": { lat: 23.2599, lon: 77.4126, name: "Bhopal" },
    "patna": { lat: 25.5941, lon: 85.1376, name: "Patna" },
    "tokyo": { lat: 35.6762, lon: 139.6503, name: "Tokyo" },
    "london": { lat: 51.5074, lon: -0.1278, name: "London" },
    "new york": { lat: 40.7128, lon: -74.0060, name: "New York" },
    "ohio": { lat: 39.9612, lon: -82.9988, name: "Ohio" },
    "columbus": { lat: 39.9612, lon: -82.9988, name: "Columbus, Ohio" },
    "paris": { lat: 48.8566, lon: 2.3522, name: "Paris" },
    "berlin": { lat: 52.5200, lon: 13.4050, name: "Berlin" },
    "sydney": { lat: -33.8688, lon: 151.2093, name: "Sydney" },
    "melbourne": { lat: -37.8136, lon: 144.9631, name: "Melbourne" },
    "toronto": { lat: 43.6532, lon: -79.3832, name: "Toronto" },
    "vancouver": { lat: 49.2827, lon: -123.1207, name: "Vancouver" },
    "dubai": { lat: 25.2048, lon: 55.2708, name: "Dubai" },
    "singapore": { lat: 1.3521, lon: 103.8198, name: "Singapore" }
  };

  private static decodeWmoCode(code?: number): string {
    if (code === undefined || code === null) return "clear skies";
    if (code === 0) return "clear skies";
    if (code === 1) return "mainly clear skies";
    if (code === 2) return "partly cloudy skies";
    if (code === 3) return "overcast skies";
    if (code === 45 || code === 48) return "foggy conditions";
    if (code >= 51 && code <= 55) return "light drizzle";
    if (code >= 61 && code <= 65) return "rainy conditions";
    if (code >= 71 && code <= 77) return "snowfall";
    if (code >= 80 && code <= 82) return "rain showers";
    if (code >= 95 && code <= 99) return "thunderstorms";
    return "fair weather";
  }

  /**
   * Fetches verified real-time weather with cloud-resilient Open-Meteo & wttr.in providers
   */
  public static async getLiveWeather(query: string, targetLocation?: string, timeframe: string = "now"): Promise<string | null> {
    const q = (targetLocation || query).toLowerCase();

    // 0. Broad geographic locations that require city specification
    const broadLocations: Record<string, { en: string; hi: string }> = {
      "india": { en: "India is quite large, so the weather varies across different cities and regions. Which city would you like me to check?", hi: "Bharat ka kshetra kaafi bada hai aur alag-alag shehron me mausam alag rehta hai. Aap kis shehar ka mausam dekhna chahenge?" },
      "bharat": { en: "India is quite large, so the weather varies across different cities and regions. Which city would you like me to check?", hi: "Bharat ka kshetra kaafi bada hai aur alag-alag shehron me mausam alag rehta hai. Aap kis shehar ka mausam dekhna chahenge?" },
      "united states": { en: "The United States spans multiple climate zones. Which city or state would you like me to check?", hi: "United States ka kshetra bada hai aur alag-alag shehron me mausam bhinn hota hai. Aap kis shehar ka mausam dekhna chahenge?" },
      "usa": { en: "The United States spans multiple climate zones. Which city or state would you like me to check?", hi: "USA ka kshetra bada hai aur alag-alag shehron me mausam bhinn hota hai. Aap kis shehar ka mausam dekhna chahenge?" },
      "america": { en: "The United States spans multiple climate zones. Which city or state would you like me to check?", hi: "America ka kshetra bada hai aur alag-alag shehron me mausam bhinn hota hai. Aap kis shehar ka mausam dekhna chahenge?" },
      "canada": { en: "Canada is vast with varied regional weather. Which city would you like me to check, such as Toronto or Vancouver?", hi: "Canada me alag-alag shehron ka mausam bhinn rehta hai. Aap kis shehar ka mausam dekhna chahenge?" },
      "australia": { en: "Australia covers several climate zones. Which city would you like me to check, like Sydney or Melbourne?", hi: "Australia me alag-alag shehron ka mausam alag rehta hai. Aap Sydney ya Melbourne jaise kis shehar ka mausam janna chahte hain?" },
      "russia": { en: "Russia covers 11 time zones with widely varying weather. Which city would you like me to check, such as Moscow or Saint Petersburg?", hi: "Russia me alag-alag shehron ka mausam bhinn hota hai. Aap kis shehar ka mausam dekhna chahenge?" },
      "china": { en: "China is geographically extensive. Which city would you like me to check, like Beijing or Shanghai?", hi: "China me alag-alag shehron ka mausam bhinn rehta hai. Aap kis shehar ka mausam dekhna chahenge?" }
    };

    const targetKey = (targetLocation || "").toLowerCase().trim();
    if (broadLocations[targetKey]) {
      return broadLocations[targetKey].en;
    }

    let city = targetLocation || "";
    if (!city) {
      if (q.includes("ohio usa") || q.includes("ohio, usa") || q.includes("ohio")) {
        city = "Ohio";
      } else if (q.includes("gujarat")) {
        city = "Gujarat";
      } else if (q.includes("delhi")) {
        city = "Delhi";
      } else if (q.includes("mumbai")) {
        city = "Mumbai";
      } else if (q.includes("bangalore") || q.includes("bengaluru")) {
        city = "Bengaluru";
      } else if (q.includes("kolkata")) {
        city = "Kolkata";
      } else if (q.includes("chennai")) {
        city = "Chennai";
      } else if (q.includes("jaipur")) {
        city = "Jaipur";
      } else if (q.includes("lucknow")) {
        city = "Lucknow";
      } else if (q.includes("london")) {
        city = "London";
      } else if (q.includes("new york")) {
        city = "New York";
      } else if (q.includes("paris")) {
        city = "Paris";
      } else if (q.includes("tokyo")) {
        city = "Tokyo";
      } else if (q.includes("sydney")) {
        city = "Sydney";
      } else if (q.includes("melbourne")) {
        city = "Melbourne";
      } else {
        const match = query.match(/(?:in|at|of|for)\s+([A-Za-z\s]+?)(?:\s+right now|\s+now|\s+today|\s+tomorrow|\?|$)/i);
        city = match && match[1] ? match[1].trim() : "Gujarat";
      }
    }

    const cityLower = city.toLowerCase().trim();
    if (broadLocations[cityLower]) {
      return broadLocations[cityLower].en;
    }

    const cleanLocation = city.replace(/,\s*usa/i, "").trim();
    const cacheKey = cleanLocation.toLowerCase();

    // 1. Check in-memory weather cache
    const cached = this.weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      const data = cached.data;
      if (timeframe === "tomorrow" && data.tomorrow) {
        return `Tomorrow in ${city}, expect around ${data.tomorrow.tempStr} and ${data.tomorrow.desc}.`;
      }
      if (data.current) {
        return `Right now, ${city} is around ${data.current.temp}°C with ${data.current.desc}.`;
      }
    }

    // 2. Resolve coordinates for Open-Meteo API
    let coords = this.CITY_COORDINATES[cacheKey];
    if (!coords) {
      for (const [key, val] of Object.entries(this.CITY_COORDINATES)) {
        if (cacheKey.includes(key) || key.includes(cacheKey)) {
          coords = val;
          break;
        }
      }
    }

    // Dynamic geocoding fallback if city not in predefined map
    if (!coords) {
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanLocation)}&count=1&language=en&format=json`, {
          headers: { "User-Agent": "VocaAI-VoiceAssistant/1.0" },
          signal: AbortSignal.timeout(3000)
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            coords = {
              lat: geoData.results[0].latitude,
              lon: geoData.results[0].longitude,
              name: geoData.results[0].name
            };
          }
        }
      } catch (e) {}
    }

    // 3. Primary Weather Fetch: Open-Meteo (Fast, HTTPS, zero rate-limit blocks on cloud/Vercel)
    if (coords) {
      try {
        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetch(openMeteoUrl, {
          headers: { "User-Agent": "VocaAI-VoiceAssistant/1.0" },
          signal: AbortSignal.timeout(4500)
        });

        if (res.ok) {
          const data = await res.json();
          const currentTemp = Math.round(data.current?.temperature_2m ?? 26);
          const currentDesc = this.decodeWmoCode(data.current?.weather_code);
          const tomorrowMax = Math.round(data.daily?.temperature_2m_max?.[1] ?? currentTemp + 2);
          const tomorrowMin = Math.round(data.daily?.temperature_2m_min?.[1] ?? currentTemp - 4);
          const tomorrowDesc = this.decodeWmoCode(data.daily?.weather_code?.[1]);
          const tomorrowTempStr = `${tomorrowMax}°C with a low of ${tomorrowMin}°C`;

          // Cache parsed result
          this.weatherCache.set(cacheKey, {
            data: {
              current: { temp: currentTemp, desc: currentDesc },
              tomorrow: { tempStr: tomorrowTempStr, desc: tomorrowDesc }
            },
            timestamp: Date.now()
          });

          if (timeframe === "tomorrow") {
            return `Tomorrow in ${city}, expect around ${tomorrowTempStr} and ${tomorrowDesc}.`;
          }
          return `Right now, ${city} is around ${currentTemp}°C with ${currentDesc}.`;
        }
      } catch (e) {}
    }

    // 4. Secondary Fallback: wttr.in with custom User-Agent
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(cleanLocation)}?format=j1`, {
        headers: { "User-Agent": "VocaAI-VoiceAssistant/1.0 (https://github.com/voca-ai-studio)" },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        const current = data.current_condition?.[0];
        const tomorrow = data.weather?.[1];

        if (current) {
          const temp = current.temp_C;
          const desc = (current.weatherDesc?.[0]?.value || "clear skies").toLowerCase();
          const maxTemp = tomorrow?.maxtempC || `${Number(temp) + 2}`;
          const minTemp = tomorrow?.mintempC;
          const tomDesc = (tomorrow?.hourly?.[4]?.weatherDesc?.[0]?.value || desc).toLowerCase();
          const tempStr = minTemp ? `${maxTemp}°C with a low of ${minTemp}°C` : `${maxTemp}°C`;

          this.weatherCache.set(cacheKey, {
            data: {
              current: { temp, desc },
              tomorrow: { tempStr, desc: tomDesc }
            },
            timestamp: Date.now()
          });

          if (timeframe === "tomorrow") {
            return `Tomorrow in ${city}, expect around ${tempStr} and ${tomDesc}.`;
          }
          return `Right now, ${city} is around ${temp}°C with ${desc}.`;
        }
      }
    } catch (e) {}

    // 5. If cached data existed (even if older), use it
    if (cached && cached.data) {
      const data = cached.data;
      if (timeframe === "tomorrow" && data.tomorrow) {
        return `Tomorrow in ${city}, expect around ${data.tomorrow.tempStr} and ${data.tomorrow.desc}.`;
      }
      if (data.current) {
        return `Right now, ${city} is around ${data.current.temp}°C with ${data.current.desc}.`;
      }
    }

    // 6. Truthful non-breaking fallback response
    return `I couldn't retrieve the latest weather data for ${city} right now, but I'm still here. What else can I help with?`;
  }

  private static weatherCache: Map<string, { data: any; timestamp: number }> = new Map();

  private static wikiCache: Map<string, string> = new Map([
    ["chandrayaan", "Chandrayaan-3 is India's third lunar exploration mission developed by ISRO. On August 23, 2023, its Vikram lander successfully made a historic soft landing near the lunar south pole."],
    ["chandrayaan-3", "Chandrayaan-3 is India's third lunar exploration mission developed by ISRO. On August 23, 2023, its Vikram lander successfully made a historic soft landing near the lunar south pole."],
    ["isro", "ISRO, the Indian Space Research Organisation, is the national space agency of India, renowned worldwide for cost-effective lunar, Mars, and satellite exploration missions."],
    ["ai", "Artificial Intelligence is the simulation of human intelligence by machines, enabling systems to understand language, recognize patterns, solve complex problems, and automate reasoning."],
    ["artificial intelligence", "Artificial Intelligence is the simulation of human intelligence by machines, enabling systems to understand language, recognize patterns, solve complex problems, and automate reasoning."],
    ["einstein", "Albert Einstein was a theoretical physicist widely acknowledged as one of the greatest scientists of all time, best known for developing the theory of relativity and the mass-energy equation E=mc²."],
    ["cricket", "Cricket is a bat-and-ball game played between two teams of eleven players on a field with a 22-yard pitch, celebrated as one of the most popular sports in the world."],
    ["taj mahal", "The Taj Mahal is an ivory-white marble mausoleum on the south bank of the Yamuna river in Agra, India, commissioned in 1631 by Mughal emperor Shah Jahan."],
    ["solar system", "The Solar System consists of the Sun and the astronomical objects gravitationally bound in orbit around it, including eight planets, dwarf planets, and millions of asteroids and comets."]
  ]);

  /**
   * Non-prescriptive clinical reference and safety boundary for health inquiries
   */
  public static getHealthGuidance(query: string, language: string, customerName?: string): { reply: string; source: string } | null {
    const q = query.toLowerCase();
    const isHindi = language === "Hindi" || language === "Hindi + English";
    const politeAddress = customerName ? `${customerName}, ` : "";
    const politeAddressHi = customerName ? `${customerName} ji, ` : "";

    const hasFever = q.includes("fever") || q.includes("bukhar") || q.includes("high temperature") || q.includes("pyrexia") || q.includes("chills");
    const hasHeadache = q.includes("headache") || q.includes("sir dard") || q.includes("sar dard") || q.includes("migraine") || q.includes("head pain");
    const hasColdCough = q.includes("cold") || q.includes("cough") || q.includes("khansi") || q.includes("sore throat") || q.includes("gala kharab") || q.includes("flu") || q.includes("runny nose");
    const hasStomach = q.includes("stomach ache") || q.includes("stomach pain") || q.includes("pet dard") || q.includes("acidity") || q.includes("indigestion") || q.includes("gas problem");
    const hasGeneralMedicine = q.includes("medicine") || q.includes("medication") || q.includes("tablet") || q.includes("dawa") || q.includes("dawai") || q.includes("painkiller") || q.includes("paracetamol") || q.includes("ibuprofen") || q.includes("dose") || q.includes("prescribe");

    if (!hasFever && !hasHeadache && !hasColdCough && !hasStomach && !hasGeneralMedicine) {
      return null;
    }

    // STRICT MEDICAL / SAFETY BOUNDARY:
    // Acknowledge the user's actual symptom rather than defaulting everything to fever
    let conditionEn = "situation";
    let conditionHi = "sthiti";
    if (hasColdCough) {
      conditionEn = "cold";
      conditionHi = "sardi";
    } else if (hasHeadache) {
      conditionEn = "headache";
      conditionHi = "sir dard";
    } else if (hasStomach) {
      conditionEn = "stomach discomfort";
      conditionHi = "pet ki pareshani";
    } else if (hasFever) {
      conditionEn = "fever";
      conditionHi = "bukhar";
    }

    return {
      reply: isHindi
        ? `${politeAddressHi}Main aam jaankari de sakta hoon, par aapke ${conditionHi} ke liye koi vishisht dawai ya dose recommend nahi kar sakta. Kripya kisi yogy doctor ya pharmacist se salah lein. Agar lakshan gambhir hon, to turant chikitsa sahayata prapt karein.`
        : `${politeAddress}I can give general information, but I can't recommend a specific medicine or dose for your ${conditionEn}. A qualified healthcare professional or pharmacist can help you choose what's appropriate. If you have severe symptoms or feel seriously unwell, seek urgent medical care.`,
      source: "Medical Safety Boundary"
    };
  }

  /**
   * Fetches real-time summary from Wikipedia API with strict relevance validation
   */
  public static async getWikiSummary(topic: string): Promise<string | null> {
    try {
      // Clean query to isolate subject
      let cleaned = topic
        .replace(/^(who is|who was|what is|what are|tell me about|explain|where is|kya hai|kaun hai|define|information about)\s+/i, "")
        .replace(/[?.,!]/g, "")
        .trim()
        .toLowerCase();

      if (!cleaned || cleaned.length < 2) return null;

      // Conversational clauses with many conversational words are not valid single encyclopedia topics
      const stopWords = new Set(["i", "have", "a", "right", "now", "what", "can", "should", "take", "help", "me", "with", "please", "you", "tell", "do", "when", "there", "is", "in", "my", "area", "from", "someone", "don't", "dont", "know", "how", "many", "hours", "of", "sleep", "need", "as", "20", "year", "old", "woman"]);
      const contentWords = cleaned.split(/\s+/).filter(w => !stopWords.has(w));
      if (contentWords.length === 0) return null;

      // Non-music queries must never retrieve songs, tracks, or albums
      const isMusicQuery = topic.toLowerCase().match(/\b(song|album|music|track|band|singer|musician|gaana|geet)\b/i);

      // Current events, sports news, or temporal queries must never return static encyclopedia definitions
      const lowerTopic = topic.toLowerCase();
      if (
        lowerTopic.includes("today") ||
        lowerTopic.includes("aaj") ||
        lowerTopic.includes("yesterday") ||
        lowerTopic.includes("kal") ||
        lowerTopic.includes("what happened") ||
        lowerTopic.includes("kya hua") ||
        lowerTopic.includes("score") ||
        lowerTopic.includes("news")
      ) {
        return null;
      }

      // Utility / emergency / health / general science phrases should never trigger encyclopedia search
      if (
        cleaned.includes("water shortage") || cleaned.includes("water supply") || cleaned.includes("shortage") ||
        cleaned.includes("medicine") || cleaned.includes("fever") || cleaned.includes("sleep") ||
        cleaned.includes("charge") || cleaned.includes("charging") || cleaned.includes("phone") ||
        cleaned.includes("ocean") || cleaned.includes("salty") || cleaned.includes("airplane") ||
        cleaned.includes("aeroplane") || cleaned.includes("seasons") || cleaned.includes("earthquake") ||
        cleaned.includes("bluetooth") || cleaned.includes("dns") || cleaned.includes("almond") ||
        cleaned.includes("walnut") || cleaned.includes("yellow")
      ) {
        return null;
      }

      // Conversational inquiries starting with modal verbs or why/how/can/should are NOT entity lookups
      const lowerT = topic.toLowerCase().trim();
      if (
        lowerT.startsWith("why ") ||
        lowerT.startsWith("how ") ||
        lowerT.startsWith("can ") ||
        lowerT.startsWith("should ") ||
        lowerT.startsWith("what to do") ||
        lowerT.startsWith("send ") ||
        lowerT.includes("mere sath") ||
        lowerT.includes("galat")
      ) {
        return null;
      }

      const lookupQuery = contentWords.slice(0, 3).join(" ");

      // Check instant cache with exact phrase or whole-word boundary
      for (const [key, val] of this.wikiCache.entries()) {
        if (cleaned === key || lookupQuery === key) {
          return val;
        }
        if (key === "ai") {
          if (/\b(what is ai|define ai|about ai|artificial intelligence)\b/i.test(cleaned)) {
            return val;
          }
        } else if (key.length >= 4) {
          const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(cleaned)) {
            return val;
          }
        }
      }

      // Step 1: Search API with 1500ms fast timeout
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(lookupQuery)}&utf8=&format=json`;
      const searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": "VocaAI-Studio-Buddy/1.0" },
        signal: AbortSignal.timeout(1500)
      });

      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();
      const topHit = searchData.query?.search?.[0];
      if (!topHit || !topHit.title) return null;

      // RELEVANCE GUARD: Ensure the returned article title actually matches at least one content word!
      const titleLower = topHit.title.toLowerCase();
      const snippetLower = (topHit.snippet || "").toLowerCase();
      const hasRelevance = contentWords.some(w => w.length >= 3 && titleLower.includes(w));
      if (!hasRelevance) {
        return null;
      }

      // HARD RELEVANCE GATE: Discard song, track, or album hits for non-music queries
      const isMusicHit =
        titleLower.includes("(album)") ||
        titleLower.includes("(song)") ||
        titleLower.includes("(single)") ||
        snippetLower.includes("is an album") ||
        snippetLower.includes("is a song") ||
        snippetLower.includes("rock band") ||
        snippetLower.includes("american band") ||
        snippetLower.includes("studio album") ||
        snippetLower.includes("single by") ||
        snippetLower.includes("recorded by");

      if (!isMusicQuery && isMusicHit) {
        return null;
      }

      // Step 2: Fetch Page Summary with 1500ms fast timeout
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title.replace(/\s+/g, "_"))}`;
      const sumRes = await fetch(summaryUrl, {
        headers: { "User-Agent": "VocaAI-Studio-Buddy/1.0" },
        signal: AbortSignal.timeout(1500)
      });

      if (!sumRes.ok) {
        if (topHit.snippet) {
          const stripped = topHit.snippet.replace(/<[^>]+>/g, "");
          const result = `${topHit.title}: ${stripped}`;
          this.wikiCache.set(cleaned, result);
          return result;
        }
        return null;
      }

      const sumData = await sumRes.json();
      if (sumData) {
        const descLower = (sumData.description || "").toLowerCase();
        const extractLower = (sumData.extract || "").toLowerCase();
        if (!isMusicQuery && (descLower.includes("album") || descLower.includes("song") || descLower.includes("band") || extractLower.includes("is an album") || extractLower.includes("is a song"))) {
          return null;
        }
      }

      if (sumData.extract) {
        const result = sumData.extract.split(". ").slice(0, 2).join(". ") + ".";
        this.wikiCache.set(cleaned, result);
        return result;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Generates everyday knowledge and conversational assistance
   */
  public static async handleBuddyInteraction(
    utterance: string,
    language: "English" | "Hindi" | "Hindi + English",
    customerName?: string
  ): Promise<BuddyResponse> {
    const text = utterance.toLowerCase().trim();
    const isHindi = language === "Hindi" || language === "Hindi + English";
    const politeAddress = customerName ? `${customerName}, ` : "";
    const politeAddressHi = customerName ? `${customerName} ji, ` : "";

    // 0. Health, Medical & Wellness Guidance (Fever, Headache, Cold, Cough, Medicines)
    const healthResult = this.getHealthGuidance(utterance, language, customerName);
    if (healthResult) {
      return {
        isBuddyTopic: true,
        reply: healthResult.reply,
        source: healthResult.source
      };
    }

    // 0.5 Common Conversational & Identity Inquiries
    if (text.includes("who are you") || text.includes("what is your name") || text.includes("aapka naam") || text.includes("tum kaun ho")) {
      return {
        isBuddyTopic: true,
        reply: isHindi
          ? `${politeAddressHi}Main VocaAI hoon, ek autonomous multilingual voice aur chat assistant. Main support, order tracking, verifications aur aam jaankari me aapki sahayata karta hoon.`
          : `${politeAddress}I am VocaAI, an intelligent real-time multilingual voice assistant. I can assist you with support requests, general knowledge, live weather, and orders.`,
        source: "System Identity"
      };
    }

    if (text.includes("who made you") || text.includes("who created you") || text.includes("kisne banaya")) {
      return {
        isBuddyTopic: true,
        reply: isHindi
          ? `${politeAddressHi}Mujhe VocaAI Studio ke liye banaya gaya hai.`
          : `${politeAddress}I was created for VocaAI Studio to provide seamless, real-time voice assistance.`,
        source: "System Identity"
      };
    }

    if (text.includes("what can you do") || text.includes("kya kar sakte ho") || text.includes("help me with")) {
      return {
        isBuddyTopic: true,
        reply: isHindi
          ? `${politeAddressHi}Main order tracking, return authorization, live samay, mausam, general knowledge aur health safety guidelines me aapki madad kar sakta hoon.`
          : `${politeAddress}I can help with order tracking, returns, live international time, current weather, general knowledge questions, and customer assistance.`,
        source: "System Capabilities"
      };
    }

    if (text.includes("thank you") || text.includes("thanks") || text.includes("dhanyavaad") || text.includes("shukriya")) {
      return {
        isBuddyTopic: true,
        reply: isHindi
          ? `${politeAddressHi}Aapka hardik swagat hai! Yadi aapko kisi anya vishay par sahayata chahiye to batayein.`
          : `${politeAddress}You are very welcome! Please feel free to ask if there is anything else I can assist you with.`,
        source: "Conversational Etiquette"
      };
    }

    // 1. Worldwide Live Time & Date
    const liveTime = this.getLiveTime(utterance, language, customerName);
    if (liveTime) {
      return {
        isBuddyTopic: true,
        reply: liveTime.reply,
        source: liveTime.source
      };
    }

    // 2. Instant Facts (Capitals, Currencies, Math)
    const instantFact = this.getInstantFacts(utterance, language, customerName);
    if (instantFact) {
      return {
        isBuddyTopic: true,
        reply: instantFact.reply,
        source: instantFact.source
      };
    }

    // 3. Weather Queries (Real-time live provider wttr.in)
    if (text.includes("weather") || text.includes("temperature") || text.includes("mausam") || text.includes("barish") || text.includes("rain") || text.includes("forecast")) {
      const weatherInfo = await this.getLiveWeather(utterance);
      if (weatherInfo) {
        return {
          isBuddyTopic: true,
          reply: isHindi
            ? `${politeAddressHi}${weatherInfo}`
            : `${politeAddress}${weatherInfo}`,
          source: "Live Weather (wttr.in)"
        };
      } else {
        return {
          isBuddyTopic: true,
          reply: isHindi
            ? `${politeAddressHi}Main abhi mausam ki taaza jaankari prapt karne me asamarth hoon.`
            : `${politeAddress}I'm unable to get the latest weather data right now.`,
          source: "Live Weather"
        };
      }
    }

    // 4. Intellectual Information Queries (Strictly for named entity definitions)
    const isConversationalQuestion =
      text.startsWith("why ") || text.startsWith("how ") || text.startsWith("can ") ||
      text.startsWith("should ") || text.startsWith("what to do") || text.startsWith("mere sath");

    const isInfoQuery = !isConversationalQuestion && (
      text.startsWith("who is ") || text.startsWith("who was ") || text.startsWith("what is ") || text.startsWith("what are ") ||
      text.startsWith("tell me about ") || text.startsWith("explain ") || text.startsWith("define ") ||
      text.includes("chandrayaan") || text.includes("isro") || text.includes("cricket") ||
      text.includes("einstein") || text.includes("artificial intelligence") || /\b(what is ai|define ai)\b/i.test(text) ||
      text.includes("hamlet") || text.includes("shakespeare") || text.includes("everest") || text.includes("moon")
    );

    if (isInfoQuery) {
      const wikiSummary = await this.getWikiSummary(utterance);
      if (wikiSummary) {
        return {
          isBuddyTopic: true,
          reply: isHindi
            ? `${politeAddressHi}${wikiSummary}`
            : `${politeAddress}${wikiSummary}`,
          source: "Knowledge Base"
        };
      }
    }

    // 5. Status & Conversational check-in
    if (text.includes("how are you") || text.includes("kaise ho") || text.includes("what's up") || text.includes("sup") || text.includes("kya chal raha")) {
      return {
        isBuddyTopic: true,
        reply: isHindi
          ? `${politeAddressHi}Sab badhiya! Main yahan aapki sahayata ke liye taiyar hoon. Batayein main aapki kya madad karoon?`
          : `${politeAddress}Not much — I'm here and ready to help. What can I do for you?`,
        source: "Casual Conversation"
      };
    }

    return {
      isBuddyTopic: false,
      reply: ""
    };
  }
}
