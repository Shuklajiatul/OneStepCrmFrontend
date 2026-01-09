const API_BASE_URL = 'https://countriesnow.space/api/v0.1/countries'

// Cache configuration
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes cache duration (increased since this data is static)

// Cache storage
const cache = {
  countries: { data: null, timestamp: null },
  phoneCountries: { data: null, timestamp: null },
  cities: new Map(), // Map<"country-state", { data, timestamp }>
}

// Helper to check if cache is valid
const isCacheValid = (cacheEntry) => {
  return cacheEntry?.data && cacheEntry?.timestamp &&
    (Date.now() - cacheEntry.timestamp) < CACHE_TTL
}

// Helper to clear expired cache entries
const cleanExpiredCache = (cacheMap) => {
  const now = Date.now()
  for (const [key, value] of cacheMap.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      cacheMap.delete(key)
    }
  }
}

// Public function to clear all caches
export function clearLocationCache() {
  cache.countries = { data: null, timestamp: null }
  cache.phoneCountries = { data: null, timestamp: null }
  cache.cities.clear()
  console.log('Location cache cleared')
}

export async function fetchCountries() {
  // Check cache first
  if (isCacheValid(cache.countries)) {
    return cache.countries.data
  }

  try {
    const response = await fetch(`${API_BASE_URL}/states`)
    const data = await response.json()

    if (data && !data.error && data.data) {
      const countries = data.data.map((country, index) => ({
        id: country.name, // Using name as ID
        name: country.name,
        iso2: country.iso2,
        iso3: country.iso3,
        states: country.states.map((state, sIndex) => ({
          id: state.name,
          name: state.name,
          state_code: state.state_code
        })),
        emoji: "" // The states API doesn't provide emoji, but info API does.
      }))

      // Store in cache
      cache.countries = { data: countries, timestamp: Date.now() }

      return countries
    }

    console.warn('No countries data found in response')
    return []
  } catch (error) {
    console.error('Error in fetchCountries:', error)
    return []
  }
}

export async function fetchPhoneCountries() {
  // Check cache first
  if (isCacheValid(cache.phoneCountries)) {
    return cache.phoneCountries.data
  }

  try {
    const response = await fetch(`${API_BASE_URL}/info?returns=currency,flag,unicodeFlag,dialCode`)
    const data = await response.json()

    if (data && !data.error && data.data) {
      const phoneCountries = data.data.map(country => ({
        code: country.name,
        label: country.name,
        dial: country.dialCode ? (country.dialCode.startsWith('+') ? country.dialCode : `+${country.dialCode}`) : '+1',
        len: 10,
        emoji: country.unicodeFlag,
        flag: country.flag
      })).filter(country => country.dial)
        .sort((a, b) => a.label.localeCompare(b.label))

      // Store in cache
      cache.phoneCountries = { data: phoneCountries, timestamp: Date.now() }

      return phoneCountries
    }
    return []
  } catch (error) {
    console.error('Error in fetchPhoneCountries:', error)
    return []
  }
}

export async function fetchStates(countryName) {
  if (!countryName) {
    console.warn('fetchStates called with empty countryName')
    return []
  }

  // Use fetchCountries to get data from cache or API
  const countries = await fetchCountries()
  const country = countries.find(c => c.name === countryName)

  return country?.states || []
}

export async function fetchCities(countryName, stateName) {
  if (!countryName || !stateName) {
    console.warn('fetchCities called with empty countryName or stateName')
    return []
  }

  // Check cache first
  const cacheKey = `${countryName}-${stateName}`
  const cachedEntry = cache.cities.get(cacheKey)
  if (isCacheValid(cachedEntry)) {
    return cachedEntry.data
  }

  try {
    const response = await fetch(`${API_BASE_URL}/state/cities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        country: countryName,
        state: stateName
      })
    })
    const data = await response.json()

    if (data && !data.error && data.data) {
      const cities = data.data.map(cityName => ({
        id: cityName,
        name: cityName
      })).sort((a, b) => a.name.localeCompare(b.name))

      // Store in cache
      cache.cities.set(cacheKey, { data: cities, timestamp: Date.now() })

      return cities
    }

    console.warn('No cities data found for:', countryName, stateName)
    return []
  } catch (error) {
    console.error('Error in fetchCities:', error)
    return []
  }
}