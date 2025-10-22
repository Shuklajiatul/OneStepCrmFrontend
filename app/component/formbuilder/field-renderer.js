"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Search, AlertCircle, Info, X } from "lucide-react"
import { fetchCountries, fetchStates, fetchCities, fetchPhoneCountries } from "@/lib/constants/location-api"
import React, { useState, useEffect } from "react"
import { Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Custom hook for location data management
const useLocationData = (currentValue, validation = {}) => {
  const [countries, setCountries] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [apiError, setApiError] = useState(null)

  // State for search functionality
  const [countrySearch, setCountrySearch] = useState("")
  const [stateSearch, setStateSearch] = useState("")
  const [citySearch, setCitySearch] = useState("")

  // State for popover open/close
  const [countryOpen, setCountryOpen] = useState(false)
  const [stateOpen, setStateOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        console.log('🌍 Loading countries for location field...')
        const countriesData = await fetchCountries()
        console.log('🌍 Countries loaded:', countriesData.length, 'countries')
        setCountries(countriesData)
        if (countriesData.length === 0) {
          setApiError('No countries data available')
        } else {
          setApiError(null)
        }
      } catch (error) {
        console.error('Failed to load countries:', error)
        setApiError('Failed to load countries data')
      }
    }
    loadCountries()
  }, [])

  // Load states when country changes
  useEffect(() => {
    const loadStates = async () => {
      if (currentValue?.country) {
        // Check if this country is allowed (for location fields with restrictions)
        const selectedCountry = countries.find(c => c.name === currentValue.country)
        if (validation.allowedCountries && validation.allowedCountries.length > 0) {
          if (!selectedCountry || !validation.allowedCountries.includes(selectedCountry.name)) {
            setStates([])
            setCities([])
            setApiError('Selected country is not allowed')
            return
          }
        }
        
        try {
          setLoadingStates(true)
          console.log('🏛️ Loading states for country:', selectedCountry.name, 'ID:', selectedCountry.id)
          const statesData = await fetchStates(selectedCountry.id)
          console.log('🏛️ States loaded:', statesData.length, 'states')
          setStates(statesData)
          if (statesData.length === 0) {
            setApiError(`No states available for selected country`)
          } else {
            setApiError(null)
          }
        } catch (error) {
          console.error('Failed to load states:', error)
          setApiError('Failed to load states data')
          setStates([])
        } finally {
          setLoadingStates(false)
        }
      } else {
        setStates([])
        setCities([])
      }
    }
    loadStates()
  }, [currentValue?.country, validation.allowedCountries, countries.length])

  // Load cities when state changes
  useEffect(() => {
    const loadCities = async () => {
      if (currentValue?.state) {
        // Check if this state is allowed (for location fields with restrictions)
        const selectedState = states.find(s => s.name === currentValue.state)
        const selectedCountry = countries.find(c => c.name === currentValue.country)
        
        if (validation.allowedStates && selectedCountry) {
          if (!selectedState || !validation.allowedStates[selectedCountry.name]?.includes(selectedState.name)) {
            setCities([])
            setApiError('Selected state is not allowed')
            return
          }
        }
        
        try {
          setLoadingCities(true)
          const citiesData = await fetchCities(selectedState.id)
          setCities(citiesData)
          if (citiesData.length === 0) {
            setApiError(`No cities available for selected state`)
          } else {
            setApiError(null)
          }
        } catch (error) {
          console.error('Failed to load cities:', error)
          setApiError('Failed to load cities data')
          setCities([])
        } finally {
          setLoadingCities(false)
        }
      } else {
        setCities([])
      }
    }
    loadCities()
  }, [currentValue?.state, validation.allowedStates, states.length])

  // Filter functions for search and field validation
  const filteredCountries = countries.filter(country => {
    // Apply field validation restrictions if they exist
    if (validation.allowedCountries && validation.allowedCountries.length > 0) {
      if (!validation.allowedCountries.includes(country.name)) {
        return false
      }
    }
    
    // Apply search filter
    return country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
           country.iso2.toLowerCase().includes(countrySearch.toLowerCase())
  })

  const filteredStates = states.filter(state => {
    // Apply field validation restrictions if they exist
    if (validation.allowedStates && currentValue?.country) {
      const selectedCountry = countries.find(c => c.name === currentValue.country)
      if (selectedCountry && validation.allowedStates[selectedCountry.name]) {
        if (!validation.allowedStates[selectedCountry.name].includes(state.name)) {
          return false
        }
      }
    }
    
    // Apply search filter
    return state.name.toLowerCase().includes(stateSearch.toLowerCase())
  })

  const filteredCities = cities.filter(city => {
    // Apply field validation restrictions if they exist
    if (validation.allowedCities && currentValue?.state) {
      const selectedState = states.find(s => s.name === currentValue.state)
      if (selectedState && validation.allowedCities[selectedState.name]) {
        if (!validation.allowedCities[selectedState.name].includes(city.name)) {
          return false
        }
      }
    }
    
    // Apply search filter
    return city.name.toLowerCase().includes(citySearch.toLowerCase())
  })

  return {
    // Data
    countries: filteredCountries,
    states: filteredStates,
    cities: filteredCities,
    allCountries: countries,
    allStates: states,
    allCities: cities,
    
    // Loading states
    loadingStates,
    loadingCities,
    apiError,
    
    // Search states
    countrySearch,
    stateSearch,
    citySearch,
    setCountrySearch,
    setStateSearch,
    setCitySearch,
    
    // Popover states
    countryOpen,
    stateOpen,
    cityOpen,
    setCountryOpen,
    setStateOpen,
    setCityOpen
  }
}

// Reusable Location Field Component
const LocationField = ({ current, validation, onChange, invalid, error, disabled }) => {
  console.log('🔍 LocationField Debug:', {
    current,
    validation,
    allowedCountries: validation?.allowedCountries,
    allowedCountriesLength: validation?.allowedCountries?.length,
    allowedStates: validation?.allowedStates
  })
  
  const locationData = useLocationData(current, validation)

  const handleCountry = (countryId) => {
    console.log('🌍 Country Selected:', countryId)
    const country = locationData.countries.find(c => c.id === parseInt(countryId))
    const newValue = {
      country: country?.name, // Send only the country name, not ID
      state: undefined,
      city: undefined
    }
    console.log('🌍 Country New Value:', newValue)
    onChange?.(newValue)
    locationData.setCountryOpen(false)
  }

  const handleState = (stateId) => {
    console.log('🏛️ State Selected:', stateId)
    const state = locationData.states?.find(s => s.id === parseInt(stateId))
    const newValue = {
      ...current,
      state: state?.name, // Send only the state name, not ID
      city: undefined
    }
    console.log('🏛️ State New Value:', newValue)
    onChange?.(newValue)
    locationData.setStateOpen(false)
  }

  const handleCity = (cityId) => {
    console.log('🏙️ City Selected:', cityId)
    const city = locationData.cities?.find(c => c.id === parseInt(cityId))
    const newValue = {
      ...current,
      city: city?.name // Send only the city name, not ID
    }
    console.log('🏙️ City New Value:', newValue)
    onChange?.(newValue)
    locationData.setCityOpen(false)
  }

  const getLocationPlaceholder = (type) => {
    if (invalid && error) {
      if (type === "country") return error
      if (type === "state" && !current.country) return "Select country first"
      if (type === "city" && !current.state) return "Select state first"
    }

    if (type === "country" && (!locationData.countries || locationData.countries.length === 0)) return "No countries available"
    if (type === "state" && (!locationData.states || locationData.states.length === 0)) return "No states available"
    if (type === "city" && (!locationData.cities || locationData.cities.length === 0)) return "No cities available"

    return type === "country" ? "Select country" : type === "state" ? "Select state" : "Select city"
  }

  const selectedCountry = locationData.countries?.find(c => c.name === current.country)
  const selectedState = locationData.states?.find(s => s.name === current.state)
  const selectedCity = locationData.cities?.find(c => c.name === current.city)

  return (
    <div className="space-y-3">
      {locationData.apiError && (
        <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-2 rounded-md">
          <AlertCircle className="h-3 w-3" />
          <span>{locationData.apiError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Country Select with Search */}
        <div>
          <Label className="text-xs text-muted-foreground">Country</Label>
          <Popover open={locationData.countryOpen} onOpenChange={locationData.setCountryOpen}>
            <PopoverTrigger asChild>
              <div
                className={`flex h-10 w-full items-center justify-between rounded-md border bg-input px-3 py-2 text-sm hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50 ${invalid ? "border-red-500 text-red-500" : "border-input text-foreground"
                  } ${disabled || locationData.countries.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedCountry ? (
                    <>
                      <span>{selectedCountry.emoji}</span>
                      <span className="truncate">{selectedCountry.name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      {getLocationPlaceholder("country")}
                    </span>
                  )}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-72 bg-background text-foreground border border-border shadow-md" align="start">
              <Command shouldFilter={false}>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder="Search countries..."
                    value={locationData.countrySearch}
                    onValueChange={locationData.setCountrySearch}
                  />
                </div>
                <CommandList>
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    {locationData.countries.map((country) => (
                      <CommandItem
                        key={country.id}
                        value={country.name}
                        onSelect={() => handleCountry(String(country.id))}
                        className="cursor-pointer"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${current.country === country.name ? "opacity-100" : "opacity-0"
                            }`}
                        />
                        <span className="mr-2">{country.emoji}</span>
                        <span>{country.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">({country.iso2})</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* State Select with Search */}
        <div>
          <Label className="text-xs text-muted-foreground">State</Label>
          <Popover open={locationData.stateOpen} onOpenChange={locationData.setStateOpen}>
            <PopoverTrigger asChild>
              <div
                className={`flex h-10 w-full items-center justify-between rounded-md border bg-input px-3 py-2 text-sm hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50 ${invalid ? "border-red-500 text-red-500" : "border-input text-foreground"
                  } ${disabled || !current.country || locationData.states.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="truncate">
                  {selectedState ? (
                    selectedState.name
                  ) : (
                    <span className="text-muted-foreground">
                      {locationData.loadingStates ? "Loading..." : getLocationPlaceholder("state")}
                    </span>
                  )}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-72 bg-background text-foreground border border-border shadow-md" align="start">
              <Command shouldFilter={false}>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder="Search states..."
                    value={locationData.stateSearch}
                    onValueChange={locationData.setStateSearch}
                  />
                </div>
                <CommandList>
                  <CommandEmpty>
                    {locationData.states.length === 0 ? "No states available" : "No state found"}
                  </CommandEmpty>
                  <CommandGroup>
                    {locationData.states.map((state) => (
                      <CommandItem
                        key={state.id}
                        value={state.name}
                        onSelect={() => handleState(String(state.id))}
                        className="cursor-pointer"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${current.state === state.name ? "opacity-100" : "opacity-0"
                            }`}
                        />
                        {state.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* City Select with Search */}
        <div>
          <Label className="text-xs text-muted-foreground">City</Label>
          <Popover open={locationData.cityOpen} onOpenChange={locationData.setCityOpen}>
            <PopoverTrigger asChild>
              <div
                className={`flex h-10 w-full items-center justify-between rounded-md border bg-input px-3 py-2 text-sm hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50 ${invalid ? "border-red-500 text-red-500" : "border-input text-foreground"
                  } ${disabled || !current.state || locationData.cities.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="truncate">
                  {selectedCity ? (
                    selectedCity.name
                  ) : (
                    <span className="text-muted-foreground">
                      {locationData.loadingCities ? "Loading..." : getLocationPlaceholder("city")}
                    </span>
                  )}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-72 bg-background text-foreground border border-border shadow-md" align="start">
              <Command shouldFilter={false}>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder="Search cities..."
                    value={locationData.citySearch}
                    onValueChange={locationData.setCitySearch}
                  />
                </div>
                <CommandList>
                  <CommandEmpty>
                    {locationData.cities.length === 0 ? "No cities available" : "No city found"}
                  </CommandEmpty>
                  <CommandGroup>
                    {locationData.cities.map((city) => (
                      <CommandItem
                        key={city.id}
                        value={city.name}
                        onSelect={() => handleCity(String(city.id))}
                        className="cursor-pointer"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${current.city === city.name ? "opacity-100" : "opacity-0"
                            }`}
                        />
                        {city.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Information message when no data available */}
      {(locationData.countries.length === 0 || locationData.states.length === 0 || locationData.cities.length === 0) && (
        <div className="flex items-center gap-2 text-blue-600 text-xs bg-blue-50 p-2 rounded-md">
          <Info className="h-3 w-3" />
          <span>
            {locationData.countries.length === 0 && "No allowed countries available based on field restrictions. "}
            {locationData.states.length === 0 && current.country && "No allowed states available for selected country. "}
            {locationData.cities.length === 0 && current.state && "No allowed cities available for selected state."}
          </span>
        </div>
      )}

      {(current.country || current.state || current.city) && !disabled && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onChange?.({ country: "", state: "", city: "" })}
            className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
            aria-label="Clear location"
          >
            <X className="h-4 w-4 inline mr-1" />
            Clear location
          </button>
        </div>
      )}

      {invalid && error && !current.country && (
        <div className="text-xs text-red-500 font-medium">
          {error}
        </div>
      )}
    </div>
  )
}


// Helper function to check if file is an image
const isImageFile = (file) => {
  return file && file.type && typeof file.type === 'string' &&
    (file.type.startsWith('image/') ||
      file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/))
}

const renderNestedFields = (field, selectedOptions, onChange, parentValue, disabled, invalid, error, locationData, depth = 0, processedIds = new Set(), hideFieldTypes = false) => {
  
  // Generate a unique key for this field if id is undefined
  const fieldKey = field.id || `field-${field.label}-${depth}-${Date.now()}`
  
  // Prevent infinite recursion by tracking processed field IDs
  if (processedIds.has(fieldKey)) {
    return null
  }
  
  // Create a new Set for this recursion level to avoid mutation issues
  const currentProcessedIds = new Set(processedIds)
  currentProcessedIds.add(fieldKey)

  const nestedFieldsToShow = []

  // Helper function to find option by value
  const findOptionByValue = (value) => {
    return field.options?.find(option => {
      const optionValue = typeof option === 'string' ? option : option.value
      return optionValue === value
    })
  }

  // For multiple select/checkbox, show nested fields for all selected options
  if (Array.isArray(selectedOptions)) {
    selectedOptions.forEach(selectedValue => {
      const option = findOptionByValue(selectedValue)
      
      if (option && typeof option === 'object' && option.nestedFields && option.nestedFields.length > 0) {
        const optionIndex = field.options?.findIndex(opt => {
          const optValue = typeof opt === 'string' ? opt : opt.value
          return optValue === selectedValue
        })
        
        // Add unique nested fields only
        option.nestedFields.forEach((nestedField, nestedIndex) => {
          // Generate unique key for nested field if id is undefined
          const nestedFieldId = nestedField.id || `nested-${nestedField.label}-${optionIndex}-${nestedIndex}`
          const nestedFieldKey = `${fieldKey}_${optionIndex}_${nestedFieldId}`
          
          if (!currentProcessedIds.has(nestedFieldKey)) {
            nestedFieldsToShow.push({
              ...nestedField,
              id: nestedFieldId,
              name: nestedField.name,
              optionIndex,
              optionValue: selectedValue,
              uniqueKey: nestedFieldKey
            })
            currentProcessedIds.add(nestedFieldKey)
          }
        })
      }
      // Fallback to old structure for backward compatibility
      else if (field.nestedFields) {
        const optionIndex = field.options?.findIndex(opt => {
          const optValue = typeof opt === 'string' ? opt : opt.value
          return optValue === selectedValue
        })
        if (optionIndex !== -1 && field.nestedFields[optionIndex]) {
          // Add unique nested fields only
          field.nestedFields[optionIndex].forEach((nestedField, nestedIndex) => {
            // Generate unique key for nested field if id is undefined
            const nestedFieldId = nestedField.id || `nested-${nestedField.label}-${optionIndex}-${nestedIndex}`
            const nestedFieldKey = `${fieldKey}_${optionIndex}_${nestedFieldId}`
            
            if (!currentProcessedIds.has(nestedFieldKey)) {
              nestedFieldsToShow.push({
                ...nestedField,
                id: nestedFieldId,
                name: nestedField.name,
                optionIndex,
                optionValue: selectedValue,
                uniqueKey: nestedFieldKey
              })
              currentProcessedIds.add(nestedFieldKey)
            }
          })
        }
      }
    })
  }
  // For single select/radio, show nested fields for the selected option
  else if (selectedOptions && typeof selectedOptions === 'string') {
    const option = findOptionByValue(selectedOptions)
    
    if (option && typeof option === 'object' && option.nestedFields && option.nestedFields.length > 0) {
      const optionIndex = field.options?.findIndex(opt => {
        const optValue = typeof opt === 'string' ? opt : opt.value
        return optValue === selectedOptions
      })
      
      // Add unique nested fields only
      option.nestedFields.forEach((nestedField, nestedIndex) => {
        // Generate unique key for nested field if id is undefined
        const nestedFieldId = nestedField.id || `nested-${nestedField.label}-${optionIndex}-${nestedIndex}`
        const nestedFieldKey = `${fieldKey}_${optionIndex}_${nestedFieldId}`
        
        if (!currentProcessedIds.has(nestedFieldKey)) {
          nestedFieldsToShow.push({
            ...nestedField,
            id: nestedFieldId,
            name: nestedField.name,
            optionIndex,
            optionValue: selectedOptions,
            uniqueKey: nestedFieldKey
          })
          currentProcessedIds.add(nestedFieldKey)
        }
      })
    }
    // Fallback to old structure for backward compatibility
    else if (field.nestedFields) {
      const optionIndex = field.options?.findIndex(opt => {
        const optValue = typeof opt === 'string' ? opt : opt.value
        return optValue === selectedOptions
      })
      if (optionIndex !== -1 && field.nestedFields[optionIndex]) {
        // Add unique nested fields only
        field.nestedFields[optionIndex].forEach((nestedField, nestedIndex) => {
          // Generate unique key for nested field if id is undefined
          const nestedFieldId = nestedField.id || `nested-${nestedField.label}-${optionIndex}-${nestedIndex}`
          const nestedFieldKey = `${fieldKey}_${optionIndex}_${nestedFieldId}`
          
          if (!currentProcessedIds.has(nestedFieldKey)) {
            nestedFieldsToShow.push({
              ...nestedField,
              id: nestedFieldId,
              name: nestedField.name,
              optionIndex,
              optionValue: selectedOptions,
              uniqueKey: nestedFieldKey
            })
            currentProcessedIds.add(nestedFieldKey)
          }
        })
      }
    }
  }
  
  if (nestedFieldsToShow.length === 0) {
    return null
  }

  const borderColor = depth === 0 ? 'border-primary/20' : depth === 1 ? 'border-blue-300/30' : 'border-green-300/30'
  const dotColor = depth === 0 ? 'bg-primary' : depth === 1 ? 'bg-blue-500' : 'bg-green-500'

  return (
    <div className="mt-4 pl-4 border-l-2 space-y-4 min-w-0 w-full" style={{ borderColor: borderColor.replace('border-', '').replace('/20', '').replace('/30', '') }}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
        Additional Information {depth > 0 && `(Level ${depth + 1})`}
        <Badge variant="secondary" className="text-xs">
          {nestedFieldsToShow.length} field{nestedFieldsToShow.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="space-y-4 w-full min-w-0">
        {nestedFieldsToShow.map((nestedField) => {
          const nestedFieldId = nestedField.uniqueKey || `${fieldKey}_${nestedField.optionIndex}_${nestedField.id}`
          
          // Get the nested value from parentValue - handle both old and new structures
          let nestedValue = null
          console.log('🔍 Getting nested value for:', {
            fieldId: nestedField.id,
            optionIndex: nestedField.optionIndex,
            parentValue: parentValue,
            nestedFields: parentValue?.nestedFields,
            optionNestedFields: parentValue?.nestedFields?.[nestedField.optionIndex]
          })

          if (parentValue?.nestedFields?.[nestedField.optionIndex]?.[nestedField.id] !== undefined) {
            nestedValue = parentValue.nestedFields[nestedField.optionIndex][nestedField.id]
            console.log('✅ Found nested value in option index:', nestedValue)
          } else if (parentValue?.nestedFields?.[nestedField.id] !== undefined) {
            nestedValue = parentValue.nestedFields[nestedField.id]
            console.log('✅ Found nested value by field ID:', nestedValue)
          } else if (parentValue?.[nestedField.id] !== undefined) {
            nestedValue = parentValue[nestedField.id]
            console.log('✅ Found nested value in parent:', nestedValue)
          } else {
            console.log('❌ No nested value found, using empty object')
            // For location fields, start with empty object
            if (nestedField.type === "location" || nestedField.type === "phone") {
              nestedValue = {}
            } else if (["select", "checkbox", "radio"].includes(nestedField.type)) {
              nestedValue = {
                value: nestedField.type === "checkbox" || (nestedField.type === "select" && nestedField.validation?.multiple) ? [] : "",
                nestedFields: {}
              }
            } else {
              nestedValue = ""
            }
          }

          // Debug the final nested value
          console.log('🔍 Final nested value for rendering:', {
            fieldId: nestedField.id,
            fieldType: nestedField.type,
            nestedValue: nestedValue,
            nestedValueType: typeof nestedValue
          })

          // For select/radio/checkbox fields, ensure the nested value has the correct structure
          if (["select", "radio", "checkbox"].includes(nestedField.type)) {
            if (typeof nestedValue === 'string' && nestedValue !== "") {
              // Convert string value to object structure for select/radio/checkbox fields
              nestedValue = {
                value: nestedValue,
                nestedFields: {}
              }
            } else if (typeof nestedValue === 'object' && nestedValue !== null && nestedValue.value !== undefined) {
              // Already in correct structure, keep as is
              nestedValue = nestedValue
            } else if (typeof nestedValue === 'object' && nestedValue !== null && !nestedValue.value) {
              // Object without value property - might be a nested fields structure
              // Check if it has nested fields and convert to proper structure
              if (Object.keys(nestedValue).length > 0) {
                nestedValue = {
                  value: "",
                  nestedFields: nestedValue
                }
              } else {
                nestedValue = {
                  value: "",
                  nestedFields: {}
                }
              }
            } else {
              // Default structure for empty values
              nestedValue = {
                value: "",
                nestedFields: {}
              }
            }
          } else {
            // For other field types (text, textarea, file, location, etc.)
            if (typeof nestedValue === 'object' && nestedValue !== null) {
              // Special handling for file fields - keep the file object as-is
              if (nestedField.type === 'file' && (nestedValue.name || nestedValue.base64)) {
                // This is a file object, keep it as-is
                nestedValue = nestedValue
              } else if (nestedField.type === 'location' && (nestedValue.country || nestedValue.state || nestedValue.city)) {
                // This is a location object, keep it as-is
                nestedValue = nestedValue
              } else if (nestedField.type === 'phone' && (nestedValue.country || nestedValue.number)) {
                // This is a phone object, keep it as-is
                nestedValue = nestedValue
              } else if (nestedValue.value !== undefined) {
                // If it's an object with a value property, extract the value
                nestedValue = nestedValue.value
              } else {
                // If it's an object without a value property, convert to string
                nestedValue = String(nestedValue)
              }
            } else if (nestedValue === null || nestedValue === undefined) {
              nestedValue = ""
            }
          }

          const handleNestedChange = (value) => {
            console.log('🔄 Nested Field Change:', {
              fieldId: nestedField.id,
              optionIndex: nestedField.optionIndex,
              currentParentValue: parentValue,
              newValue: value
            })

            const currentNestedFields = parentValue?.nestedFields || {}
            const optionNestedFields = currentNestedFields[nestedField.optionIndex] || {}

            const updatedNestedFields = {
              ...currentNestedFields,
              [nestedField.optionIndex]: {
                ...optionNestedFields,
                [nestedField.id]: value
              }
            }

            const newParentValue = {
              ...parentValue,
              nestedFields: updatedNestedFields
            }

            console.log('🔄 Updated Parent Value:', newParentValue)
            onChange(newParentValue)
          }

          return (
            <div key={nestedFieldId} className="p-3 bg-muted/30 rounded-lg space-y-2 w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between min-w-0">
                <Label className="text-sm font-medium truncate">
                  {nestedField.label}
                  {nestedField.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {!hideFieldTypes && (
                  <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                    {nestedField.type}
                  </Badge>
                )}
              </div>
              
              {/* Render the nested field input */}
              {renderNestedFieldInput(nestedField, nestedValue, handleNestedChange, disabled, invalid, error, {
                countries: locationData?.countries || [],
                states: locationData?.states || [],
                cities: locationData?.cities || [],
                phoneCountries: locationData?.phoneCountries || [],
                loadingStates: locationData?.loadingStates || false,
                loadingCities: locationData?.loadingCities || false,
                loadingPhoneCountries: locationData?.loadingPhoneCountries || false,
                apiError: locationData?.apiError || null,
                countrySearch: locationData?.countrySearch || "",
                stateSearch: locationData?.stateSearch || "",
                citySearch: locationData?.citySearch || "",
                phoneCountrySearch: locationData?.phoneCountrySearch || "",
                countryOpen: locationData?.countryOpen || false,
                stateOpen: locationData?.stateOpen || false,
                cityOpen: locationData?.cityOpen || false,
                phoneCountryOpen: locationData?.phoneCountryOpen || false,
                setCountrySearch: locationData?.setCountrySearch || (() => {}),
                setStateSearch: locationData?.setStateSearch || (() => {}),
                setCitySearch: locationData?.setCitySearch || (() => {}),
                setPhoneCountrySearch: locationData?.setPhoneCountrySearch || (() => {}),
                setCountryOpen: locationData?.setCountryOpen || (() => {}),
                setStateOpen: locationData?.setStateOpen || (() => {}),
                setCityOpen: locationData?.setCityOpen || (() => {}),
                setPhoneCountryOpen: locationData?.setPhoneCountryOpen || (() => {}),
                filteredCountries: locationData?.filteredCountries || [],
                filteredStates: locationData?.filteredStates || [],
                filteredCities: locationData?.filteredCities || [],
                filteredPhoneCountries: locationData?.filteredPhoneCountries || []
              })}
              
              {/* Recursively render nested fields if this field has nested fields */}
              {/* Check if this nested field itself has nested fields in its options */}
              {nestedField.options && nestedField.options.some(option => 
                option.nestedFields && option.nestedFields.length > 0
              ) && (
                <div className="mt-3">
                  {renderNestedFields(
                    nestedField, 
                    nestedValue?.value || nestedValue, 
                    (deepValue) => {
                      // Create a recursive change handler that properly propagates changes through all nesting levels
                      const currentNestedFields = parentValue?.nestedFields || {}
                      const optionNestedFields = currentNestedFields[nestedField.optionIndex] || {}
                      
                      // Handle deep nested values properly - merge the deep value structure
                      let updatedOptionNestedFields
                      if (typeof deepValue === 'object' && deepValue !== null && deepValue.nestedFields) {
                        // Deep value contains nested fields - merge them properly
                        updatedOptionNestedFields = {
                          ...optionNestedFields,
                          [nestedField.id]: {
                            ...optionNestedFields[nestedField.id],
                            ...deepValue
                          }
                        }
                      } else {
                        // Simple value update
                        updatedOptionNestedFields = {
                          ...optionNestedFields,
                          [nestedField.id]: deepValue
                        }
                      }
                      
                      const updatedNestedFields = {
                        ...currentNestedFields,
                        [nestedField.optionIndex]: updatedOptionNestedFields
                      }

                      onChange({
                        ...parentValue,
                        nestedFields: updatedNestedFields
                      })
                    }, 
                    nestedValue, 
                    disabled, 
                    invalid, 
                    error,
                    {
                      countries: locationData?.countries || [],
                      states: locationData?.states || [],
                      cities: locationData?.cities || [],
                      phoneCountries: locationData?.phoneCountries || [],
                      loadingStates: locationData?.loadingStates || false,
                      loadingCities: locationData?.loadingCities || false,
                      loadingPhoneCountries: locationData?.loadingPhoneCountries || false,
                      apiError: locationData?.apiError || null,
                      countrySearch: locationData?.countrySearch || "",
                      stateSearch: locationData?.stateSearch || "",
                      citySearch: locationData?.citySearch || "",
                      phoneCountrySearch: locationData?.phoneCountrySearch || "",
                      countryOpen: locationData?.countryOpen || false,
                      stateOpen: locationData?.stateOpen || false,
                      cityOpen: locationData?.cityOpen || false,
                      phoneCountryOpen: locationData?.phoneCountryOpen || false,
                      setCountrySearch: locationData?.setCountrySearch || (() => {}),
                      setStateSearch: locationData?.setStateSearch || (() => {}),
                      setCitySearch: locationData?.setCitySearch || (() => {}),
                      setPhoneCountrySearch: locationData?.setPhoneCountrySearch || (() => {}),
                      setCountryOpen: locationData?.setCountryOpen || (() => {}),
                      setStateOpen: locationData?.setStateOpen || (() => {}),
                      setCityOpen: locationData?.setCityOpen || (() => {}),
                      setPhoneCountryOpen: locationData?.setPhoneCountryOpen || (() => {}),
                      filteredCountries: locationData?.filteredCountries || [],
                      filteredStates: locationData?.filteredStates || [],
                      filteredCities: locationData?.filteredCities || [],
                      filteredPhoneCountries: locationData?.filteredPhoneCountries || []
                    }, 
                    depth + 1, 
                    new Set(currentProcessedIds),
                    hideFieldTypes
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const renderNestedFieldInput = (nestedField, value, onChange, disabled, invalid, error, {
  countries = [],
  states = [],
  cities = [],
  phoneCountries = [],
  loadingStates = false,
  loadingCities = false,
  loadingPhoneCountries = false,
  apiError = null,
  countrySearch = "",
  stateSearch = "",
  citySearch = "",
  phoneCountrySearch = "",
  countryOpen = false,
  stateOpen = false,
  cityOpen = false,
  phoneCountryOpen = false,
  setCountrySearch = () => { },
  setStateSearch = () => { },
  setCitySearch = () => { },
  setPhoneCountrySearch = () => { },
  setCountryOpen = () => { },
  setStateOpen = () => { },
  setCityOpen = () => { },
  setPhoneCountryOpen = () => { },
  filteredCountries = [],
  filteredStates = [],
  filteredCities = [],
  filteredPhoneCountries = []
}, depth = 0, processedIds = new Set()) => {

  // Fix: Ensure value is properly handled for location fields
  let safeValue = value
  if (nestedField.type === "location" && typeof value === 'string' && value === '[object Object]') {
    console.warn('⚠️ Fixing stringified object value for location field:', value)
    safeValue = {}
  } else if (nestedField.type === "location" && typeof value === 'string' && value.startsWith('{')) {
    try {
      safeValue = JSON.parse(value)
      console.log('✅ Parsed location value from JSON string:', safeValue)
    } catch (e) {
      console.warn('❌ Failed to parse location value as JSON:', value)
      safeValue = {}
    }
  } else if (nestedField.type === "location" && (value === null || value === undefined || value === '')) {
    safeValue = {}
  }

  // Use safeValue instead of value for the rest of the function
  const current = safeValue || {}

  // Parse validation for nested fields - handle both object and string formats
  let validation = {}
  if (nestedField.validations) {
    if (typeof nestedField.validations === 'string') {
      try {
        validation = JSON.parse(nestedField.validations)
      } catch (e) {
        console.warn('Failed to parse nested field validations as JSON:', nestedField.validations)
      }
    } else if (typeof nestedField.validations === 'object') {
      validation = nestedField.validations
    }
  } else if (nestedField.validation) {
    if (typeof nestedField.validation === 'string') {
      try {
        validation = JSON.parse(nestedField.validation)
      } catch (e) {
        console.warn('Failed to parse nested field validation as JSON:', nestedField.validation)
      }
    } else if (typeof nestedField.validation === 'object') {
      validation = nestedField.validation
    }
  }

  // For location fields, ensure validation has proper structure
  if (nestedField.type === 'location') {
    validation = {
      allowedCountries: validation.allowedCountries || [],
      allowedStates: validation.allowedStates || {},
      ...validation
    }
  }

  console.log('🔍 Nested Field Validation Debug:', {
    fieldId: nestedField.id,
    fieldLabel: nestedField.label,
    fieldType: nestedField.type,
    rawValidations: nestedField.validations,
    rawValidation: nestedField.validation,
    parsedValidation: validation,
    allowedCountries: validation.allowedCountries,
    allowedCountriesLength: validation.allowedCountries?.length,
    allowedStates: validation.allowedStates
  })
  switch (nestedField.type) {
    case "text":
    case "email":
      return (
        <div className="relative">
          <Input
            type={nestedField.type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={nestedField.placeholder}
            minLength={validation?.minLength}
            maxLength={validation?.maxLength}
            className={`pr-8 ${invalid ? "border-red-500" : ""}`}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear input"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    case "number":
      return (
        <div className="relative">
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={nestedField.placeholder}
            min={validation?.min}
            max={validation?.max}
            className={`pr-8 ${invalid ? "border-red-500" : ""}`}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear input"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    case "textarea":
      return (
        <div className="relative">
          <Textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={nestedField.placeholder}
            minLength={validation?.minLength}
            maxLength={validation?.maxLength}
            className={`pr-8 ${invalid ? "border-red-500" : ""}`}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear textarea"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    case "select":
      if (validation?.multiple) {
        const selectedValues = Array.isArray(value?.value) ? value.value : []
        const currentNestedFields = value?.nestedFields || {}

        return (
          <div className="space-y-3">
            <Popover>
              <PopoverTrigger asChild>
                <div
                  className={`flex h-10 w-full items-center justify-between rounded-md border bg-input px-3 py-2 text-sm hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50 ${invalid
                    ? "border-red-500 text-red-500 placeholder-red-500"
                    : "border-input text-foreground"
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex flex-wrap items-center gap-1 flex-1 overflow-hidden">
                    {selectedValues.length > 0 ? (
                      selectedValues.map((selectedValue, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs"
                        >
                          {selectedValue}
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!onChange) return
                              const newValues = selectedValues.filter((v) => v !== selectedValue)
                              const newNestedFields = { ...currentNestedFields }
                              // Remove nested fields for this option if they exist
                              const optionIndex = nestedField.options?.indexOf(selectedValue)
                              if (optionIndex !== -1 && newNestedFields[optionIndex]) {
                                delete newNestedFields[optionIndex]
                              }
                              onChange({
                                value: newValues,
                                nestedFields: newNestedFields
                              })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                if (!onChange) return
                                const newValues = selectedValues.filter((v) => v !== selectedValue)
                                const newNestedFields = { ...currentNestedFields }
                                // Remove nested fields for this option if they exist
                                const optionIndex = nestedField.options?.indexOf(selectedValue)
                                if (optionIndex !== -1 && newNestedFields[optionIndex]) {
                                  delete newNestedFields[optionIndex]
                                }
                                onChange({
                                  value: newValues,
                                  nestedFields: newNestedFields
                                })
                              }
                            }}
                            className="hover:bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold cursor-pointer"
                            title={`Remove ${selectedValue}`}
                          >
                            X
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">{nestedField.placeholder || "Select options"}</span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-72 sm:w-80 bg-background text-foreground border border-border shadow-md" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search options..." />
                  <CommandEmpty>No option found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {nestedField.options
                        ?.filter((option) => {
                          if (typeof option === 'string') {
                            return option && option.trim() !== ""
                          } else if (typeof option === 'object' && option !== null) {
                            return option.value && option.value.trim() !== ""
                          }
                          return false
                        })
                        .map((option, index) => {
                          const optionValue = typeof option === 'string' ? option : option.value
                          const optionLabel = typeof option === 'string' ? option : option.label
                          const checked = selectedValues.includes(optionValue)
                          return (
                            <CommandItem
                              key={`${nestedField.id}-${index}`}
                              value={optionValue}
                              onSelect={() => {
                                if (!onChange) return
                                let newValues
                                let newNestedFields = { ...currentNestedFields }
                                
                                if (checked) {
                                  newValues = selectedValues.filter((v) => v !== optionValue)
                                  // Remove nested fields for this option if they exist
                                  if (newNestedFields[index]) {
                                    delete newNestedFields[index]
                                  }
                                } else {
                                  newValues = [...selectedValues, optionValue]
                                  // Initialize nested fields for this option if they exist
                                  if (nestedField.nestedFields && nestedField.nestedFields[index]) {
                                    newNestedFields[index] = {}
                                  }
                                }
                                onChange({
                                  value: newValues,
                                  nestedFields: newNestedFields
                                })
                              }}
                              className="cursor-pointer"
                            >
                              <span className="mr-2 flex h-4 w-4 items-center justify-center border rounded-sm bg-background">
                                {checked && <Check className="h-3 w-3" />}
                              </span>
                              {optionLabel}
                            </CommandItem>
                          )
                        })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )
      } else {
        const selectedValue = value?.value || ""
        const currentNestedFields = value?.nestedFields || {}

        return (
          <div className="space-y-3">
            <Select
              value={selectedValue}
              onValueChange={(selectedOption) => {
                if (!onChange) return
                const newNestedFields = {}
                
                // Only keep nested fields for the currently selected option
                const selectedOptionIndex = nestedField.options?.indexOf(selectedOption)
                if (selectedOptionIndex !== -1 && nestedField.nestedFields && nestedField.nestedFields[selectedOptionIndex]) {
                  newNestedFields[selectedOptionIndex] = currentNestedFields[selectedOptionIndex] || {}
                }
                
                onChange({
                  value: selectedOption,
                  nestedFields: newNestedFields
                })
              }}
              disabled={disabled}
            >
              <SelectTrigger className={invalid ? "border-red-500" : ""}>
                <SelectValue placeholder={nestedField.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {nestedField.options?.filter(option => {
                  const optionValue = typeof option === 'string' ? option : option.value
                  return optionValue && optionValue.trim() !== ''
                }).map((option, index) => {
                  const optionValue = typeof option === 'string' ? option : option.value
                  const optionLabel = typeof option === 'string' ? option : option.label
                  return (
                    <SelectItem key={index} value={optionValue}>
                      {optionLabel}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )
      }
    case "checkbox":
      const selectedValues = Array.isArray(value?.value) ? value.value : []
      const currentNestedFieldsCheckbox = value?.nestedFields || {}

      return (
        <div className="space-y-2">
          {nestedField.options && nestedField.options.length > 0 ? nestedField.options.map((option, index) => {
            const optionValue = typeof option === 'string' ? option : option.value
            const optionLabel = typeof option === 'string' ? option : option.label
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${nestedField.id}-${index}`}
                    checked={selectedValues.includes(optionValue)}
                  onCheckedChange={(checked) => {
                    if (!onChange) return
                    let newValues
                    let newNestedFields = { ...currentNestedFieldsCheckbox }

                    if (checked) {
                      newValues = [...selectedValues, optionValue]
                      // Initialize nested fields for this option if they exist
                      if (nestedField.nestedFields && nestedField.nestedFields[index]) {
                        newNestedFields[index] = newNestedFields[index] || {}
                      }
                    } else {
                      newValues = selectedValues.filter((v) => v !== optionValue)
                      // Remove nested fields for this option if they exist
                      if (newNestedFields[index]) {
                        delete newNestedFields[index]
                      }
                    }

                    onChange({
                      value: newValues,
                      nestedFields: newNestedFields
                    })
                  }}
                  disabled={disabled}
                  className={invalid ? "border-red-500" : ""}
                />
                <Label htmlFor={`${nestedField.id}-${index}`} className="text-sm font-normal cursor-pointer">
                  {optionLabel}
                </Label>
              </div>
            </div>
            )
          }) : (
            <div className="text-sm text-muted-foreground p-2 border border-dashed rounded text-center">
              No options available
            </div>
          )}
        </div>
      )
    case "radio":
      const selectedValue = value?.value || ""
      const currentNestedFieldsRadio = value?.nestedFields || {}

      return (
        <div className="space-y-2">
          {nestedField.options && nestedField.options.length > 0 ? (
            <div className="space-y-2">
              <RadioGroup
                value={selectedValue}
                onValueChange={(selectedOption) => {
                  if (!onChange) return
                  const newNestedFields = {}
                  
                  // Only keep nested fields for the currently selected option
                  const selectedOptionIndex = nestedField.options?.indexOf(selectedOption)
                  if (selectedOptionIndex !== -1 && nestedField.nestedFields && nestedField.nestedFields[selectedOptionIndex]) {
                    newNestedFields[selectedOptionIndex] = currentNestedFieldsRadio[selectedOptionIndex] || {}
                  }
                  
                  onChange({
                    value: selectedOption,
                    nestedFields: newNestedFields
                  })
                }}
                disabled={disabled}
                className={invalid ? "text-red-500" : ""}
              >
                {nestedField.options.map((option, index) => {
                  const optionValue = typeof option === 'string' ? option : option.value
                  const optionLabel = typeof option === 'string' ? option : option.label
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={optionValue} id={`${nestedField.id}-${index}`} className={invalid ? "border-red-500" : ""} />
                        <Label htmlFor={`${nestedField.id}-${index}`} className="text-sm font-normal cursor-pointer">
                          {optionLabel}
                      </Label>
                    </div>
                  </div>
                  )
                })}
              </RadioGroup>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-2 border border-dashed rounded text-center">
              No options available
            </div>
          )}
          {selectedValue && !disabled && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onChange({ value: "", nestedFields: {} })}
                className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4 inline mr-1" />
                Clear selection
              </button>
            </div>
          )}
        </div>
      )
    case "file":
      const handleFileChange = async (e) => {
        const file = e.target.files?.[0] || null

        if (!file) {
          onChange(null)
          return
        }

        // File type validation
        if (validation?.accept) {
          const acceptedTypes = validation.accept.split(",").map((type) => type.trim())
          const fileName = file.name || ""
          const fileType = file.type || ""

          const isAccepted = acceptedTypes.some((acceptType) => {
            if (acceptType.startsWith(".")) {
              return fileName.toLowerCase().endsWith(acceptType.toLowerCase())
            } else if (acceptType.includes("*")) {
              const baseType = acceptType.split("/")[0]
              return fileType.startsWith(baseType + "/")
            } else {
              return fileType === acceptType
            }
          })

          if (!isAccepted) {
            alert(`File type not allowed. Accepted types: ${validation.accept}`)
            e.target.value = ''
            onChange(null)
            return
          }
        }

        // File size validation
        if (validation?.maxSize) {
          const maxSizeBytes = validation.maxSize * 1024 * 1024 // Convert MB to bytes
          if (file.size > maxSizeBytes) {
            alert(`File size must be less than ${validation.maxSize}MB.`)
            e.target.value = ''
            onChange(null)
            return
          }
        }

        try {
          const base64 = await fileToBase64(file)
          const fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            base64: base64
          }
          onChange(fileData)
        } catch (error) {
          console.error('Error converting file to base64:', error)
          alert('Error processing file. Please try again.')
          e.target.value = ''
          onChange(null)
        }
      }

      const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = () => resolve(reader.result)
          reader.onerror = error => reject(error)
        })
      }

      return (
        <div className="space-y-2">
          <Input
            type="file"
            onChange={handleFileChange}
            disabled={disabled}
            className={`bg-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${invalid ? "border-red-500" : ""
              }`}
            accept={validation?.accept || ".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf"}
          />
          {value && value.name && (
            <div className="p-3 border border-green-200 bg-green-50 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 flex items-center justify-center rounded ${value.type === 'application/pdf' || value.name.toLowerCase().endsWith('.pdf')
                    ? 'bg-red-100 text-red-600'
                    : 'bg-blue-100 text-blue-600'
                    }`}>
                    {value.type === 'application/pdf' || value.name.toLowerCase().endsWith('.pdf') ? (
                      <span className="text-xs font-bold">PDF</span>
                    ) : (
                      <span className="text-xs">IMG</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {value.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(value.size || 0)} • {value.type || 'Unknown type'}
                    </p>
                    <p className="text-xs text-green-600">
                      ✓ Ready to upload ({formatFileSize(value.base64?.length || 0)} as base64)
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Preview button for images and PDFs */}
                  {(value.type?.includes('image/') || value.type === 'application/pdf') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (value.base64) {
                          const newWindow = window.open()
                          if (value.type.includes('image/')) {
                            newWindow.document.write(`
                              <html>
                                <head><title>${value.name}</title></head>
                                <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5;">
                                  <img src="${value.base64}" style="max-width: 90vw; max-height: 90vh; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
                                </body>
                              </html>
                            `)
                          } else if (value.type === 'application/pdf') {
                            newWindow.document.write(`
                              <html>
                                <head><title>${value.name}</title></head>
                                <body style="margin: 0;">
                                  <embed src="${value.base64}" type="application/pdf" width="100%" height="100%" style="min-height: 100vh;" />
                                </body>
                              </html>
                            `)
                          }
                        }
                      }}
                      className="px-3 py-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md border border-transparent hover:border-green-200 transition-colors"
                    >
                      Preview
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null)
                      const fileInput = document.querySelector('input[type="file"]')
                      if (fileInput) fileInput.value = ''
                    }}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Image preview for image files */}
              {value.type?.includes('image/') && value.base64 && (
                <div className="mt-2">
                  <img
                    src={value.base64}
                    alt="Preview"
                    className="max-h-32 max-w-full rounded border"
                    onError={(e) => {
                      console.error('Error loading image preview')
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )
    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={nestedField.placeholder}
          min={validation?.min}
          max={validation?.max}
          className={invalid ? "border-red-500" : ""}
        />
      )
    case "phone": {
      const current = value || {}
      const country = current.country || ""
      const number = current.number || ""

      const handleCountry = (countryCode) => {
        const phoneCountry = phoneCountries.find(c => c.code === countryCode)
        onChange?.({
          country: countryCode,
          dial_code: phoneCountry?.dial,
          number: number
        })
        setPhoneCountryOpen(false)
      }

      const handleNumber = (val) => {
        // Remove all non-digit characters
        const numbersOnly = val.replace(/\D/g, '')
        onChange?.({
          ...current,
          number: numbersOnly
        })
      }

      const handleKeyDown = (e) => {
        // Prevent non-numeric characters
        if (!/[0-9]|Backspace|Delete|Tab|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End/.test(e.key)) {
          e.preventDefault()
        }
      }

      const handlePaste = (e) => {
        e.preventDefault()
        const pastedText = e.clipboardData.getData('text')
        // Remove all non-digit characters from pasted text
        const numbersOnly = pastedText.replace(/\D/g, '')
        // Update the input value
        e.target.value = numbersOnly
        handleNumber(numbersOnly)
      }

      const selectedCountry = phoneCountries.find(c => c.code === country)

      return (
        <div className="space-y-2">
          <div className="grid grid-cols-[140px_1fr] gap-2">
            {/* Phone Country Select with Search */}
            <div>
              <Label className="text-xs text-muted-foreground">Country Code</Label>
              <Popover open={phoneCountryOpen} onOpenChange={setPhoneCountryOpen}>
                <PopoverTrigger asChild>
                  <div
                    className={`flex h-10 w-full items-center justify-between rounded-md border bg-input px-3 py-2 text-sm hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50 ${invalid ? "border-red-500 text-red-500" : "border-input text-foreground"
                      } ${disabled || loadingPhoneCountries ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {selectedCountry ? (
                        <>
                          {selectedCountry.emoji}
                          <span className="truncate text-xs">{selectedCountry.dial}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {loadingPhoneCountries ? "Loading..." : "Select"}
                        </span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-80 bg-background text-foreground border border-border shadow-md" align="start">
                  <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <CommandInput
                        placeholder="Search countries..."
                        value={phoneCountrySearch}
                        onValueChange={setPhoneCountrySearch}
                      />
                    </div>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandList className="max-h-60">
                      <CommandGroup>
                        {filteredPhoneCountries.map((country) => (
                          <CommandItem
                            key={country.code}
                            value={`${country.label} ${country.dial}`}
                            onSelect={() => handleCountry(country.code)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${current.country === country.code ? "opacity-100" : "opacity-0"
                                }`}
                            />
                            {country.emoji} {country.label} ({country.dial})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Phone Number</Label>
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={invalid && error ? error : (nestedField.placeholder || "1234567890")}
                value={number}
                onChange={(e) => handleNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={disabled}
                className={`bg-input ${invalid ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
                aria-label="Phone number"
              />
            </div>
          </div>
          {!invalid && selectedCountry && (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedCountry.emoji} {selectedCountry.label} • Format: {selectedCountry.dial} {selectedCountry.len} digits
            </p>
          )}
          {(country || number) && !disabled && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onChange?.({ country: "", dial_code: "", number: "" })}
                className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                aria-label="Clear phone"
              >
                <X className="h-4 w-4 inline mr-1" />
                Clear phone
              </button>
            </div>
          )}
          {!invalid && !selectedCountry && (
            <p className="text-xs text-muted-foreground">Select country code, then enter phone number</p>
          )}
        </div>
      )
    }

    case "location": {
      console.log('🔍 Nested Location Field Debug:', {
        fieldId: nestedField.id,
        fieldLabel: nestedField.label,
        originalValue: value,
        safeValue: safeValue,
        current: current,
        validation: validation
      })

      // Use the same LocationField component for nested fields
      return (
        <LocationField 
          key={`nested-location-${nestedField.id}`}
          current={current}
          validation={validation}
          onChange={onChange}
          invalid={invalid}
          error={error}
          disabled={disabled}
        />
      )
    }

    default:
      return (
        <div className="relative">
          <Input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={nestedField.placeholder}
            className={`pr-8 ${invalid ? "border-red-500" : ""}`}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear input"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )
  }
}

export function FieldRenderer({ field, value, onChange, disabled = false, invalid = false, error, hideFieldTypes = false }) {
  const safeOnChange = onChange || (() => {})
  const [countries, setCountries] = useState([])
  const [phoneCountries, setPhoneCountries] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingPhoneCountries, setLoadingPhoneCountries] = useState(false)
  const [apiError, setApiError] = useState(null)

  // State for search functionality
  const [countrySearch, setCountrySearch] = useState("")
  const [stateSearch, setStateSearch] = useState("")
  const [citySearch, setCitySearch] = useState("")
  const [phoneCountrySearch, setPhoneCountrySearch] = useState("")

  // State for popover open/close
  const [countryOpen, setCountryOpen] = useState(false)
  const [stateOpen, setStateOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false)

  // Fetch countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await fetchCountries()
        setCountries(countriesData)
        if (countriesData.length === 0) {
          setApiError('No countries data available')
        } else {
          setApiError(null)
        }
      } catch (error) {
        console.error('Failed to load countries:', error)
        setApiError('Failed to load countries data')
      }
    }
    loadCountries()
  }, [])

  // Fetch phone countries on component mount
  useEffect(() => {
    const loadPhoneCountries = async () => {
      try {
        setLoadingPhoneCountries(true)
        const phoneCountriesData = await fetchPhoneCountries()
        setPhoneCountries(phoneCountriesData)
      } catch (error) {
        console.error('Failed to load phone countries:', error)
      } finally {
        setLoadingPhoneCountries(false)
      }
    }
    loadPhoneCountries()
  }, [])

  // Fetch states when country changes or when component mounts with existing values (edit mode)
  useEffect(() => {
    const loadStates = async () => {
      const current = value || {}
      if (current.country) {
        // Find the country by name (since current.country contains the country name, not ID)
        const selectedCountry = countries.find(c => c.name === current.country)
        
        if (!selectedCountry) {
          console.warn('Country not found in countries list:', current.country)
          setStates([])
          setCities([])
          setApiError('Selected country not found')
          return
        }
        
        // Check if this country is allowed (for location fields with restrictions)
        if (field.type === 'location' && field.validation?.allowedCountries?.length > 0) {
          if (!field.validation.allowedCountries.includes(selectedCountry.name)) {
            setStates([])
            setCities([])
            setApiError('Selected country is not allowed')
            return
          }
        }
        
        try {
          setLoadingStates(true)
          // Pass the country ID, not the country name
          const statesData = await fetchStates(selectedCountry.id)
          setStates(statesData)
          if (statesData.length === 0) {
            setApiError(`No states available for selected country`)
          } else {
            setApiError(null)
          }
        } catch (error) {
          console.error('Failed to load states:', error)
          setApiError('Failed to load states data')
          setStates([])
        } finally {
          setLoadingStates(false)
        }
      } else {
        setStates([])
        setCities([])
      }
    }
    loadStates()
  }, [value?.country, field.validation?.allowedCountries, countries.length])

  // Fetch cities when state changes or when states are loaded with existing state value (edit mode)
  useEffect(() => {
    const loadCities = async () => {
      const current = value || {}
      if (current.state) {
        // Find the state by name (since current.state contains the state name, not ID)
        const selectedState = states.find(s => s.name === current.state)
        const selectedCountry = countries.find(c => c.id === parseInt(current.country))
        
        if (!selectedState) {
          console.warn('State not found in states list:', current.state)
          setCities([])
          setApiError('Selected state not found')
          return
        }
        
        // Check if this state is allowed (for location fields with restrictions)
        if (field.type === 'location' && field.validation?.allowedStates && selectedCountry) {
          if (!field.validation.allowedStates[selectedCountry.name]?.includes(selectedState.name)) {
            setCities([])
            setApiError('Selected state is not allowed')
            return
          }
        }
        
        try {
          setLoadingCities(true)
          // Pass the state ID, not the state name
          const citiesData = await fetchCities(selectedState.id)
          setCities(citiesData)
          if (citiesData.length === 0) {
            setApiError(`No cities available for selected state`)
          } else {
            setApiError(null)
          }
        } catch (error) {
          console.error('Failed to load cities:', error)
          setApiError('Failed to load cities data')
          setCities([])
        } finally {
          setLoadingCities(false)
        }
      } else {
        setCities([])
      }
    }
    loadCities()
  }, [value?.state, field.validation?.allowedStates, states.length])

  // Filter functions for search and field validation
  const filteredCountries = countries.filter(country => {
    // Apply field validation restrictions if they exist
    if (field.type === 'location' && field.validation?.allowedCountries?.length > 0) {
      if (!field.validation.allowedCountries.includes(country.name)) {
        return false
      }
    }
    
    // Apply search filter
    return country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
           country.iso2.toLowerCase().includes(countrySearch.toLowerCase())
  })

  const filteredStates = states.filter(state => {
    // Apply field validation restrictions if they exist
    if (field.type === 'location' && field.validation?.allowedStates && value?.country) {
      const selectedCountry = countries.find(c => c.id === parseInt(value.country))
      if (selectedCountry && field.validation.allowedStates[selectedCountry.name]) {
        if (!field.validation.allowedStates[selectedCountry.name].includes(state.name)) {
          return false
        }
      }
    }
    
    // Apply search filter
    return state.name.toLowerCase().includes(stateSearch.toLowerCase())
  })

  const filteredCities = cities.filter(city => {
    // Apply field validation restrictions if they exist
    if (field.type === 'location' && field.validation?.allowedCities && value?.state) {
      const selectedState = states.find(s => s.id === parseInt(value.state))
      if (selectedState && field.validation.allowedCities[selectedState.name]) {
        if (!field.validation.allowedCities[selectedState.name].includes(city.name)) {
          return false
        }
      }
    }
    
    // Apply search filter
    return city.name.toLowerCase().includes(citySearch.toLowerCase())
  })

  const filteredPhoneCountries = phoneCountries.filter(country =>
    country.label.toLowerCase().includes(phoneCountrySearch.toLowerCase()) ||
    country.code.toLowerCase().includes(phoneCountrySearch.toLowerCase()) ||
    country.dial.includes(phoneCountrySearch)
  )

  // Reset search when popover closes
  useEffect(() => {
    if (!countryOpen) setCountrySearch("")
  }, [countryOpen])

  useEffect(() => {
    if (!stateOpen) setStateSearch("")
  }, [stateOpen])

  useEffect(() => {
    if (!cityOpen) setCitySearch("")
  }, [cityOpen])

  useEffect(() => {
    if (!phoneCountryOpen) setPhoneCountrySearch("")
  }, [phoneCountryOpen])

  // Get placeholder text
  const getPlaceholder = () => {
    if (invalid && error) {
      return error
    }
    return field.placeholder || (field.type === "email" ? "Enter your email" : "")
  }

  const getSelectPlaceholder = () => {
    if (invalid && error) {
      return error
    }
    return field.placeholder || "Select an option"
  }

  const locationData = {
    countries,
    states,
    cities,
    phoneCountries,
    loadingStates,
    loadingCities,
    loadingPhoneCountries,
    apiError,
    countrySearch,
    stateSearch,
    citySearch,
    phoneCountrySearch,
    countryOpen,
    stateOpen,
    cityOpen,
    phoneCountryOpen,
    setCountrySearch,
    setStateSearch,
    setCitySearch,
    setPhoneCountrySearch,
    setCountryOpen,
    setStateOpen,
    setCityOpen,
    setPhoneCountryOpen,
    filteredCountries,
    filteredStates,
    filteredCities,
    filteredPhoneCountries
  }

  const renderField = () => {
    const placeholder = getPlaceholder()
    const selectPlaceholder = getSelectPlaceholder()

    switch (field.type) {
      case "text":
        return (
          <div className="relative">
            <Input
              type="text"
              placeholder={placeholder}
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled}
              className={`bg-input pr-8 ${invalid ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {value && !disabled && (
              <button
                type="button"
                onClick={() => onChange?.("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )

      case "email":
        return (
          <div className="relative">
            <Input
              type="email"
              placeholder={placeholder}
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled}
              className={`bg-input pr-8 ${invalid ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {value && !disabled && (
              <button
                type="button"
                onClick={() => onChange?.("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )

      case "number":
        return (
          <div className="relative">
            <Input
              type="number"
              placeholder={placeholder}
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled}
              min={field.validation?.min}
              max={field.validation?.max}
              className={`bg-input pr-8 ${invalid ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {value && !disabled && (
              <button
                type="button"
                onClick={() => onChange?.("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )

      case "textarea":
        return (
          <div className="relative">
            <Textarea
              placeholder={placeholder}
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled}
              className={`bg-input min-h-[100px] pr-8 ${invalid ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {value && !disabled && (
              <button
                type="button"
                onClick={() => onChange?.("")}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear textarea"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )

      case "select":
        if (field.validation?.multiple) {
          const selectedValues = Array.isArray(value?.value) ? value?.value : []

          return (
            <div className="space-y-3">
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    className={`flex h-10 w-full items-center justify-between rounded-md border bg-input px-3 py-2 text-sm hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50 ${invalid
                      ? "border-red-500 text-red-500 placeholder-red-500"
                      : "border-input text-foreground"
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex flex-wrap items-center gap-1 flex-1 overflow-hidden">
                      {selectedValues.length > 0 ? (
                        selectedValues.map((selectedValue, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs"
                          >
                            {selectedValue}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!onChange) return
                                const newValues = selectedValues.filter((v) => v !== selectedValue)

                                safeOnChange({
                                  value: newValues,
                                  nestedFields: value?.nestedFields || {}
                                })
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if (!onChange) return
                                  const newValues = selectedValues.filter((v) => v !== selectedValue)
                                  safeOnChange({
                                    value: newValues,
                                    nestedFields: value?.nestedFields || {}
                                  })
                                }
                              }}
                              className="hover:bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold cursor-pointer"
                              title={`Remove ${selectedValue}`}
                            >
                              X
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">{selectPlaceholder}</span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-72 sm:w-80 bg-background text-foreground border border-border shadow-md" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search options..." />
                    <CommandEmpty>No option found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {field.options
                          ?.filter((option) => {
                            if (typeof option === 'string') {
                              return option && option.trim() !== ""
                            } else if (typeof option === 'object' && option !== null) {
                              return option.value && option.value.trim() !== ""
                            }
                            return false
                          })
                          .map((option, index) => {
                            const optionValue = typeof option === 'string' ? option : option.value
                            const optionLabel = typeof option === 'string' ? option : option.label
                            const checked = selectedValues.includes(optionValue)
                            return (
                              <CommandItem
                                key={`${field.id}-${index}`}
                                value={optionValue}
                                onSelect={() => {
                                  if (!onChange) return
                                  let newValues
                                  if (checked) {
                                    newValues = selectedValues.filter((v) => v !== optionValue)
                                  } else {
                                    newValues = [...selectedValues, optionValue]
                                  }
                                  
                                  // Only keep nested fields for currently selected options
                                  const newNestedFields = {}
                                  newValues.forEach(selectedOption => {
                                    const optionIndex = field.options?.findIndex(opt => {
                                      const optValue = typeof opt === 'string' ? opt : opt.value
                                      return optValue === selectedOption
                                    })
                                    if (optionIndex !== -1 && field.nestedFields && field.nestedFields[optionIndex]) {
                                      newNestedFields[optionIndex] = value?.nestedFields?.[optionIndex] || {}
                                    }
                                  })
                                  
                                  safeOnChange({
                                    value: newValues,
                                    nestedFields: newNestedFields
                                  })
                                }}
                                className="cursor-pointer"
                              >
                                <span className="mr-2 flex h-4 w-4 items-center justify-center border rounded-sm bg-background">
                                  {checked && <Check className="h-3 w-3" />}
                                </span>
                                {optionLabel}
                              </CommandItem>
                            )
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {renderNestedFields(field, selectedValues, onChange, value, disabled, invalid, error, locationData, 0, new Set(), hideFieldTypes)}
            </div>
          )
        } else {
          return (
            <div className="space-y-3">
              <Select value={value?.value || ""} onValueChange={(selectedValue) => {
                // Clear nested fields when switching options
                const newNestedFields = {}
                
                // Only keep nested fields for the currently selected option
                const selectedOptionIndex = field.options?.indexOf(selectedValue)
                if (selectedOptionIndex !== -1 && field.nestedFields && field.nestedFields[selectedOptionIndex]) {
                  newNestedFields[selectedOptionIndex] = value?.nestedFields?.[selectedOptionIndex] || {}
                }
                
                safeOnChange({
                  value: selectedValue,
                  nestedFields: newNestedFields
                })
              }} disabled={disabled}>
                <SelectTrigger className={`bg-input ${invalid ? "border-red-500 text-red-500" : ""}`}>
                  <SelectValue placeholder={selectPlaceholder} />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground border border-border shadow-md z-50">
                  {field.options
                    ?.filter((option) => {
                      if (typeof option === 'string') {
                        return option && option.trim() !== ""
                      } else if (typeof option === 'object' && option !== null) {
                        return option.value && option.value.trim() !== ""
                      }
                      return false
                    })
                    .map((option, index) => {
                      const optionValue = typeof option === 'string' ? option : option.value
                      const optionLabel = typeof option === 'string' ? option : option.label
                      return (
                        <SelectItem
                          key={index}
                          value={optionValue || `option-${index}`}
                          className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        >
                          {optionLabel}
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>

              {renderNestedFields(field, value?.value, onChange, value, disabled, invalid, error, locationData, 0, new Set(), hideFieldTypes)}
            </div>
          )
        }

      case "checkbox":
        return (
          <div className="space-y-3">
            {field.options && field.options.length > 0 ? field.options.map((option, index) => {
              const optionValue = typeof option === 'string' ? option : option.value
              const optionLabel = typeof option === 'string' ? option : option.label
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.id}-${index}`}
                      checked={Array.isArray(value?.value) ? value.value.includes(optionValue) : false}
                    onCheckedChange={(checked) => {
                      if (!onChange) return
                      const currentValue = Array.isArray(value?.value) ? value.value : []
                      const currentNestedFields = value?.nestedFields || {}

                      let newValue
                      if (checked) {
                        newValue = [...currentValue, optionValue]
                      } else {
                        newValue = currentValue.filter((v) => v !== optionValue)
                        
                        // Remove nested fields for this option if they exist
                        if (field.nestedFields && field.nestedFields[index]) {
                          const { [index]: removed, ...remainingNestedFields } = currentNestedFields
                          safeOnChange({
                            value: newValue,
                            nestedFields: remainingNestedFields
                          })
                          return
                        }
                      }

                      safeOnChange({
                        value: newValue,
                        nestedFields: currentNestedFields
                      })
                    }}
                    disabled={disabled}
                    className={invalid ? "border-red-500" : ""}
                  />
                  <Label htmlFor={`${field.id}-${index}`} className={`text-sm font-normal cursor-pointer ${invalid ? "text-red-500" : ""}`}>
                    {optionLabel}
                  </Label>
                </div>

                {Array.isArray(value?.value) && value.value?.includes(optionValue) && field.nestedFields && field.nestedFields[index] && (
                  <div className="ml-6 space-y-3">
                    {renderNestedFields(field, [optionValue], onChange, value, disabled, invalid, error, locationData, 0, new Set(), hideFieldTypes)}
                  </div>
                )}
              </div>
              )
            }) : (
              <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                No options available. Add options in the field configuration panel.
              </div>
            )}
            {invalid && (
              <div className="text-xs text-red-500 font-medium">
                {error}
              </div>
            )}
          </div>
        )

      case "radio":
        return (
          <div className="space-y-3">
            {field.options && field.options.length > 0 ? (
              <RadioGroup 
                value={value?.value || ""} 
                onValueChange={(selectedValue) => {
                  // Clear nested fields when switching options
                  const newNestedFields = {}
                  
                  // Only keep nested fields for the currently selected option
                  const selectedOptionIndex = field.options?.indexOf(selectedValue)
                  if (selectedOptionIndex !== -1 && field.nestedFields && field.nestedFields[selectedOptionIndex]) {
                    newNestedFields[selectedOptionIndex] = value?.nestedFields?.[selectedOptionIndex] || {}
                  }
                  
                  safeOnChange({
                    value: selectedValue,
                    nestedFields: newNestedFields
                  })
                }}
                disabled={disabled}
                className={invalid ? "text-red-500" : ""}
              >
                {field.options.map((option, index) => {
                  const optionValue = typeof option === 'string' ? option : option.value
                  const optionLabel = typeof option === 'string' ? option : option.label
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={optionValue} id={`${field.id}-${index}`} className={invalid ? "border-red-500" : ""} />
                        <Label htmlFor={`${field.id}-${index}`} className="text-sm font-normal cursor-pointer">
                          {optionLabel}
                        </Label>
                      </div>

                      {value?.value === optionValue && field.nestedFields && field.nestedFields[index] && (
                        <div className="ml-6 space-y-3">
                          {renderNestedFields(field, optionValue, onChange, value, disabled, invalid, error, locationData, 0, new Set(), hideFieldTypes)}
                      </div>
                    )}
                  </div>
                  )
                })}
              </RadioGroup>
            ) : (
              <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                No options available. Add options in the field configuration panel.
              </div>
            )}
            {value?.value && !disabled && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => safeOnChange({ value: "", nestedFields: {} })}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4 inline mr-1" />
                  Clear selection
                </button>
              </div>
            )}
            {(value?.country || value?.state || value?.city) && !disabled && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onChange?.({ country: "", state: "", city: "" })}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                  aria-label="Clear location"
                >
                  <X className="h-4 w-4 inline mr-1" />
                  Clear location
                </button>
              </div>
            )}
            {invalid && (
              <div className="text-xs text-red-500 font-medium">
                {error}
              </div>
            )}
          </div>
        )

      case "file": {
        const handleFileChange = async (e) => {
          const file = e.target.files?.[0] || null

          if (!file) {
            onChange?.(null)
            return
          }

          // File type validation based on field configuration
          const fileType = field.validation?.fileType || "both"
          
          let allowedTypes = []
          let allowedExtensions = []
          let errorMessage = ""
          
          if (fileType === "images") {
            // Image-only field
            allowedTypes = [
              'image/jpeg',
              'image/jpg', 
              'image/png',
              'image/gif',
              'image/webp',
              'image/svg+xml'
            ]
            allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
            errorMessage = 'Please select only image files (JPEG, PNG, GIF, WebP, SVG)'
          } else if (fileType === "pdf") {
            // PDF-only field
            allowedTypes = ['application/pdf']
            allowedExtensions = ['.pdf']
            errorMessage = 'Please select only PDF files'
          } else {
            // Default: allow both images and PDFs
            allowedTypes = [
              'image/jpeg',
              'image/jpg',
              'image/png',
              'image/gif',
              'image/webp',
              'image/svg+xml',
              'application/pdf'
            ]
            allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf']
            errorMessage = 'Please select only image files (JPEG, PNG, GIF, WebP, SVG) or PDF files'
          }

          // Check both MIME type and file extension
          const isValidType = allowedTypes.includes(file.type) ||
            allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

          if (!isValidType) {
            toast.error(errorMessage)
            e.target.value = ''
            onChange?.(null)
            return
          }

          // Validate file size (5MB = 5 * 1024 * 1024 bytes)
          const maxSize = 5 * 1024 * 1024 // 5MB in bytes
          if (file.size > maxSize) {
            toast.error('File size must be less than 5MB.')
            e.target.value = ''
            onChange?.(null)
            return
          }

          try {
            // Convert file to base64
            const base64 = await fileToBase64(file)

            // Create object with file info and base64 data
            const fileData = {
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              base64: base64
            }

            onChange?.(fileData)
          } catch (error) {
            console.error('Error converting file to base64:', error)
            toast.error('Error processing file. Please try again.')
            e.target.value = ''
            onChange?.(null)
          }
        }

        // Helper function to convert file to base64
        const fileToBase64 = (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
              resolve(reader.result)
            }
            reader.onerror = error => reject(error)
          })
        }

        // Get accepted file types for input
        const getAcceptedTypes = () => {
          return ".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf"
        }



        const fileValue = value || null

        // Debug logging for file fields
        console.log('🔍 FieldRenderer file field debug:', {
          fieldId: field.id,
          fieldLabel: field.label,
          fieldType: field.type,
          value: value,
          fileValue: fileValue,
          hasName: fileValue && fileValue.name,
          hasBase64: fileValue && fileValue.base64,
          isFileObject: fileValue && typeof fileValue === 'object' && fileValue.name && fileValue.base64,
          valueStructure: value ? Object.keys(value) : 'no value',
          fileValueStructure: fileValue ? Object.keys(fileValue) : 'no fileValue'
        })

        return (
          <div className="space-y-2">
            <Input
              type="file"
              onChange={handleFileChange}
              disabled={disabled}
              className={`bg-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${invalid ? "border-red-500" : ""
                }`}
              accept={getAcceptedTypes()}
            />

            {/* File info display */}
            {fileValue && fileValue.name && (
              <div className="p-3 border border-green-200 bg-green-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 flex items-center justify-center rounded ${fileValue.type === 'application/pdf' || fileValue.name.toLowerCase().endsWith('.pdf')
                      ? 'bg-red-100 text-red-600'
                      : 'bg-blue-100 text-blue-600'
                      }`}>
                      {fileValue.type === 'application/pdf' || fileValue.name.toLowerCase().endsWith('.pdf') ? (
                        <span className="text-xs font-bold">PDF</span>
                      ) : (
                        <span className="text-xs">IMG</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {fileValue.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(fileValue.size || 0)} • {fileValue.type || 'Unknown type'}
                      </p>
                      <p className="text-xs text-green-600">
                        ✓ Ready to upload ({formatFileSize(fileValue.base64?.length || 0)} as base64)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Preview button for images and PDFs */}
                    {(fileValue.type?.includes('image/') || fileValue.type === 'application/pdf') && (
                      <button
                        type="button"
                        onClick={() => {
                          if (fileValue.base64) {
                            const newWindow = window.open()
                            if (fileValue.type.includes('image/')) {
                              newWindow.document.write(`
                                <html>
                                  <head><title>${fileValue.name}</title></head>
                                  <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5;">
                                    <img src="${fileValue.base64}" style="max-width: 90vw; max-height: 90vh; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
                                  </body>
                                </html>
                              `)
                            } else if (fileValue.type === 'application/pdf') {
                              newWindow.document.write(`
                                <html>
                                  <head><title>${fileValue.name}</title></head>
                                  <body style="margin: 0;">
                                    <embed src="${fileValue.base64}" type="application/pdf" width="100%" height="100%" style="min-height: 100vh;" />
                                  </body>
                                </html>
                              `)
                            }
                          }
                        }}
                        className="px-3 py-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md border border-transparent hover:border-green-200 transition-colors"
                      >
                        Preview
                      </button>
                    )}
                    
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.(null)
                      // Reset the file input
                      const fileInput = document.querySelector('input[type="file"]')
                      if (fileInput) fileInput.value = ''
                    }}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200 transition-colors"
                  >
                    Remove
                  </button>
                  </div>
                </div>

                {/* Image preview for image files - with safe access */}
                {isImageFile(fileValue) && fileValue.base64 && (
                  <div className="mt-2">
                    <img
                      src={fileValue.base64}
                      alt="Preview"
                      className="max-h-32 max-w-full rounded border"
                      onError={(e) => {
                        console.error('Error loading image preview')
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Fallback display for base64 strings that weren't converted to file objects */}
            {!fileValue && value && typeof value === 'string' && value.startsWith('data:') && (
              <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 flex items-center justify-center rounded bg-yellow-100 text-yellow-600">
                      <span className="text-xs">FILE</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        File detected (base64 format)
                      </p>
                      <p className="text-xs text-yellow-600">
                        ⚠️ File object conversion needed
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Try to convert the base64 string to a file object
                      try {
                        const matches = value.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/)
                        if (matches && matches.length === 3) {
                          const mimeType = matches[1]
                          const base64Data = matches[2]
                          const extension = mimeType.split('/')[1] || 'bin'
                          const filename = `file.${extension}`
                          const size = Math.floor((base64Data.length * 3) / 4)
                          
                          const fileObject = {
                            name: filename,
                            type: mimeType,
                            size: size,
                            base64: value,
                            previewUrl: value,
                            lastModified: Date.now(),
                            isFromBase64: true
                          }
                          
                          console.log('🔄 Converting base64 to file object:', fileObject)
                          onChange?.(fileObject)
                        }
                      } catch (error) {
                        console.error('Error converting base64 to file object:', error)
                      }
                    }}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-transparent hover:border-blue-200 transition-colors"
                  >
                    Convert
                  </button>
                </div>
              </div>
            )}

            {/* Help text */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Allowed formats: JPEG, PNG, GIF, WebP, SVG, PDF</p>
              <p>Maximum file size: 5MB</p>
              <p className="text-blue-600">Files will be converted to base64 format</p>
              {/* {field.validation?.multiple && (
                  <p>Multiple files allowed</p>
                )} */}
            </div>

            {invalid && (
              <div className="text-xs text-red-500 font-medium">
                {error}
              </div>
            )}
          </div>
        )
      }

      case "datetime":
        return (
          <Input
            type="datetime-local"
            placeholder={placeholder}
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            className={`bg-input ${invalid ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        )

      case "location": {
        const current = value || {}

        // Use the same LocationField component for main fields
        return (
          <LocationField 
            current={current}
            validation={field.validation || {}}
            onChange={onChange}
            invalid={invalid}
            error={error}
            disabled={disabled}
          />
        )
      }

      case "phone": {
        const current = value || {}
        const country = current.country || ""
        const number = current.number || ""

        const handleCountry = (countryCode) => {
          const phoneCountry = phoneCountries.find(c => c.code === countryCode)
          onChange?.({
            country: countryCode,
            dial_code: phoneCountry?.dial,
            number: number
          })
          setPhoneCountryOpen(false)
        }

        const handleNumber = (val) => {
          // Remove all non-digit characters
          const numbersOnly = val.replace(/\D/g, '')
          onChange?.({
            ...current,
            number: numbersOnly
          })
        }

        const handleKeyDown = (e) => {
          // Prevent non-numeric characters
          if (!/[0-9]|Backspace|Delete|Tab|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End/.test(e.key)) {
            e.preventDefault()
          }
        }

        const handlePaste = (e) => {
          e.preventDefault()
          const pastedText = e.clipboardData.getData('text')
          // Remove all non-digit characters from pasted text
          const numbersOnly = pastedText.replace(/\D/g, '')
          // Update the input value
          e.target.value = numbersOnly
          handleNumber(numbersOnly)
        }

        const selectedCountry = phoneCountries.find(c => c.code === country)

        return (
          <div className="space-y-2">
            <div className="grid grid-cols-[140px_1fr] gap-2">
              {/* Phone Country Select with Search */}
              <div>
                <Label className="text-xs text-muted-foreground">Country Code</Label>
                <Popover open={phoneCountryOpen} onOpenChange={setPhoneCountryOpen}>
                  <PopoverTrigger asChild>
                    <div
                      className={`flex h-10 w-full items-center justify-between rounded-md border bg-input px-3 py-2 text-sm hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50 ${invalid ? "border-red-500 text-red-500" : "border-input text-foreground"
                        } ${disabled || loadingPhoneCountries ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {selectedCountry ? (
                          <>
                            {selectedCountry.emoji}
                            <span className="truncate text-xs">{selectedCountry.dial}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {loadingPhoneCountries ? "Loading..." : "Select"}
                          </span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-80 bg-background text-foreground border border-border shadow-md" align="start">
                    <Command shouldFilter={false}>
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <CommandInput
                          placeholder="Search countries..."
                          value={phoneCountrySearch}
                          onValueChange={setPhoneCountrySearch}
                        />
                      </div>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandList className="max-h-60">
                        <CommandGroup>
                          {filteredPhoneCountries.map((country) => (
                            <CommandItem
                              key={country.code}
                              value={`${country.label} ${country.dial}`}
                              onSelect={() => handleCountry(country.code)}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${current.country === country.code ? "opacity-100" : "opacity-0"
                                  }`}
                              />
                              {country.emoji} {country.label} ({country.dial})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Phone Number</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={invalid && error ? error : (field.placeholder || "1234567890")}
                  value={number}
                  onChange={(e) => handleNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  disabled={disabled}
                  className={`bg-input ${invalid ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
                  aria-label="Phone number"
                />
              </div>
            </div>
            {(country || number) && !disabled && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onChange?.({ country: "", dial_code: "", number: "" })}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                  aria-label="Clear phone"
                >
                  <X className="h-4 w-4 inline mr-1" />
                  Clear phone
                </button>
              </div>
            )}
            {!invalid && selectedCountry && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedCountry.emoji} {selectedCountry.label} • Format: {selectedCountry.dial} {selectedCountry.len} digits
              </p>
            )}
            {!invalid && !selectedCountry && (
              <p className="text-xs text-muted-foreground">Select country code, then enter phone number</p>
            )}
          </div>
        )
      }

      default:
        return (
          <div className={`text-muted-foreground ${invalid ? "text-red-500" : ""}`}>
            {invalid && error ? error : "Unknown field type"}
          </div>
        )
    }
  }

  return (
    <div className="space-y-2 w-full">
      <Label className={`text-sm font-medium ${invalid ? "text-red-500" : ""}`}>
        {field.label}
        {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
      </Label>
      {renderField()}
      {!invalid && field.validation?.pattern && (
        <p className="text-xs text-muted-foreground">Pattern: {field.validation.pattern}</p>
      )}
    </div>
  )
}