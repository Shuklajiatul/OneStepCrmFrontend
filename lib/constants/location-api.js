// app/utils/location-api.js
// axios removed

const API_BASE_URL = 'https://csc.sidsworld.co.in/api'

// Cache configuration
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes cache duration

// Cache storage
const cache = {
  countries: { data: null, timestamp: null },
  phoneCountries: { data: null, timestamp: null },
  states: new Map(), // Map<countryId, { data, timestamp }>
  cities: new Map(), // Map<stateId, { data, timestamp }>
}

// Helper to check if cache is valid
const isCacheValid = (cacheEntry) => {
  return cacheEntry?.data && cacheEntry?.timestamp &&
    (Date.now() - cacheEntry.timestamp) < CACHE_TTL
}

// Helper to clear expired cache entries (called periodically)
const cleanExpiredCache = (cacheMap) => {
  const now = Date.now()
  for (const [key, value] of cacheMap.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      cacheMap.delete(key)
    }
  }
}

// Public function to clear all caches (useful for debugging or forced refresh)
export function clearLocationCache() {
  cache.countries = { data: null, timestamp: null }
  cache.phoneCountries = { data: null, timestamp: null }
  cache.states.clear()
  cache.cities.clear()
  console.log('Location cache cleared')
}

export async function fetchCountries() {
  // Check cache first
  if (isCacheValid(cache.countries)) {
    return cache.countries.data
  }

  try {
    const response = await fetch(`${API_BASE_URL}/countries`)
    const data = await response.json()

    if (data && data.status === 200 && data.countries) {
      const countries = data.countries.map(country => ({
        id: country.id,
        name: country.name || country.status,
        iso2: country.iso2,
        iso3: country.iso3,
        phonecode: country.phonecode,
        currency: country.currency,
        emoji: country.emoji
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
    const response = await fetch(`${API_BASE_URL}/countries`)
    const data = await response.json()

    if (data && data.status === 200 && data.countries) {
      const phoneCountries = data.countries.map(country => ({
        code: country.iso2,
        label: country.name || country.status,
        dial: country.phonecode ? `+${country.phonecode}` : '+1',
        len: 10,
        emoji: country.emoji
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

export async function fetchStates(countryId) {
  // Validate countryId parameter
  if (!countryId) {
    console.warn('fetchStates called with empty countryId')
    return []
  }

  // Ensure countryId is numeric
  const numericCountryId = parseInt(countryId)
  if (isNaN(numericCountryId)) {
    console.error('fetchStates called with non-numeric countryId:', countryId)
    return []
  }

  // Check cache first
  const cacheKey = numericCountryId
  const cachedEntry = cache.states.get(cacheKey)
  if (isCacheValid(cachedEntry)) {
    return cachedEntry.data
  }

  // Clean expired entries periodically (every 10th call)
  if (cache.states.size > 50) {
    cleanExpiredCache(cache.states)
  }

  try {
    const response = await fetch(`${API_BASE_URL}/states/${numericCountryId}`)
    const data = await response.json()

    if (data && (data.states || data.data)) {
      const statesArray = data.states || data.data || []

      const states = statesArray.map(state => ({
        id: state.id,
        name: state.name,
        country_id: state.country_id,
        country_code: state.country_code
      })).sort((a, b) => a.name.localeCompare(b.name))

      // Store in cache
      cache.states.set(cacheKey, { data: states, timestamp: Date.now() })

      return states
    }

    console.warn('No states data found for country ID:', numericCountryId)
    return []
  } catch (error) {
    console.error('Error in fetchStates:', error)
    console.error('Country ID:', countryId)
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      // data: error.response?.data, // fetch error might not have data property accessible this way
      url: `${API_BASE_URL}/states/${numericCountryId}`
    })
    return []
  }
}

export async function fetchCities(stateId) {
  // Validate stateId parameter
  if (!stateId) {
    console.warn('fetchCities called with empty stateId')
    return []
  }

  // Ensure stateId is numeric
  const numericStateId = parseInt(stateId)
  if (isNaN(numericStateId)) {
    console.error('fetchCities called with non-numeric stateId:', stateId)
    return []
  }

  // Check cache first
  const cacheKey = numericStateId
  const cachedEntry = cache.cities.get(cacheKey)
  if (isCacheValid(cachedEntry)) {
    return cachedEntry.data
  }

  // Clean expired entries periodically
  if (cache.cities.size > 100) {
    cleanExpiredCache(cache.cities)
  }

  try {
    const response = await fetch(`${API_BASE_URL}/cities/${numericStateId}`)
    const data = await response.json()

    if (data && (data.cities || data.countries || data.data)) {
      const citiesArray = data.cities || data.countries || data.data || []

      const cities = citiesArray.map(city => ({
        id: city.id,
        name: city.name,
        state_id: city.state_id || numericStateId,
        state_code: city.state_code,
        country_id: city.country_id
      })).sort((a, b) => a.name.localeCompare(b.name))

      // Store in cache
      cache.cities.set(cacheKey, { data: cities, timestamp: Date.now() })

      return cities
    }

    console.warn('No cities data found for state ID:', numericStateId)
    return []
  } catch (error) {
    console.error('Error in fetchCities:', error)
    console.error('State ID:', stateId)
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      // data: error.response?.data,
      url: `${API_BASE_URL}/cities/${numericStateId}`
    })

    // Return empty array instead of throwing error
    return []
  }
}