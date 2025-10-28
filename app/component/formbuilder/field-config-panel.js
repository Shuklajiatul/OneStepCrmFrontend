"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, X, Copy, Trash2, Settings2, ChevronDown, ChevronRight, ChevronUp } from "lucide-react"
import { useState, useEffect, useCallback, useRef, memo, Fragment, useMemo } from "react"
import { TableColumnSelector } from "./table-column-selector"
import { fetchCountries, fetchStates, fetchCities } from "@/lib/constants/location-api"

// Custom hook for debounced updates
const useDebouncedUpdate = (callback, delay = 3000) => {
  const timeoutRef = useRef(null)

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])

  return debouncedCallback
}

export function FieldConfigPanel({ field, onUpdateField, allFields = [] }) {
  const [newOption, setNewOption] = useState("")
  const [expandedNestedFields, setExpandedNestedFields] = useState({})
  const [forceRenderKey, setForceRenderKey] = useState(0)

  // Location configuration state
  const [countries, setCountries] = useState([])
  const [statesByCountry, setStatesByCountry] = useState({})
  const [citiesByState, setCitiesByState] = useState({})
  const [loadingStates, setLoadingStates] = useState({})
  const [loadingCities, setLoadingCities] = useState({})
  const [manualCityInput, setManualCityInput] = useState("")
  const [showManualCityInput, setShowManualCityInput] = useState({})

  // Debounced update function to prevent excessive re-renders
  const debouncedUpdateField = useDebouncedUpdate(onUpdateField, 1000)

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await fetchCountries()
        setCountries(countriesData)
      } catch (error) {
        console.error('Failed to load countries:', error)
      }
    }
    loadCountries()
  }, [])

  // Location configuration functions
  const addAllowedCountry = (countryName) => {
    const currentAllowed = field.validation?.allowedCountries || []
    if (!currentAllowed.includes(countryName)) {
      onUpdateField(field.id, {
        validation: {
          ...field.validation,
          allowedCountries: [...currentAllowed, countryName]
        }
      })
    }
  }

  const removeAllowedCountry = (countryName) => {
    const currentAllowed = field.validation?.allowedCountries || []
    const newAllowed = currentAllowed.filter(c => c !== countryName)

    // Also remove states and cities for this country
    const newAllowedStates = { ...field.validation?.allowedStates }
    const newAllowedCities = { ...field.validation?.allowedCities }
    delete newAllowedStates[countryName]

    // Remove cities for states of this country
    Object.keys(newAllowedCities).forEach(state => {
      if (newAllowedStates[state]) {
        delete newAllowedCities[state]
      }
    })

    onUpdateField(field.id, {
      validation: {
        ...field.validation,
        allowedCountries: newAllowed,
        allowedStates: newAllowedStates,
        allowedCities: newAllowedCities
      }
    })
  }

  const addAllowedState = (countryName, stateName) => {
    const currentAllowedStates = field.validation?.allowedStates || {}
    const countryStates = currentAllowedStates[countryName] || []

    if (!countryStates.includes(stateName)) {
      onUpdateField(field.id, {
        validation: {
          ...field.validation,
          allowedStates: {
            ...currentAllowedStates,
            [countryName]: [...countryStates, stateName]
          }
        }
      })
    }
  }

  const removeAllowedState = (countryName, stateName) => {
    const currentAllowedStates = field.validation?.allowedStates || {}
    const countryStates = (currentAllowedStates[countryName] || []).filter(s => s !== stateName)

    // Also remove cities for this state
    const newAllowedCities = { ...field.validation?.allowedCities }
    delete newAllowedCities[stateName]

    onUpdateField(field.id, {
      validation: {
        ...field.validation,
        allowedStates: {
          ...currentAllowedStates,
          [countryName]: countryStates
        },
        allowedCities: newAllowedCities
      }
    })
  }

  const addAllowedCity = (stateName, cityName) => {
    const currentAllowedCities = field.validation?.allowedCities || {}
    const stateCities = currentAllowedCities[stateName] || []

    if (!stateCities.includes(cityName)) {
      onUpdateField(field.id, {
        validation: {
          ...field.validation,
          allowedCities: {
            ...currentAllowedCities,
            [stateName]: [...stateCities, cityName]
          }
        }
      })
    }
  }

  const removeAllowedCity = (stateName, cityName) => {
    const currentAllowedCities = field.validation?.allowedCities || {}
    const stateCities = (currentAllowedCities[stateName] || []).filter(c => c !== cityName)

    onUpdateField(field.id, {
      validation: {
        ...field.validation,
        allowedCities: {
          ...currentAllowedCities,
          [stateName]: stateCities
        }
      }
    })
  }

  const addManualCity = (stateName) => {
    if (!manualCityInput.trim()) return

    const currentAllowedCities = field.validation?.allowedCities || {}
    const stateCities = currentAllowedCities[stateName] || []

    if (!stateCities.includes(manualCityInput.trim())) {
      onUpdateField(field.id, {
        validation: {
          ...field.validation,
          allowedCities: {
            ...currentAllowedCities,
            [stateName]: [...stateCities, manualCityInput.trim()]
          }
        }
      })
    }

    setManualCityInput("")
    setShowManualCityInput(false)
  }

  const loadStatesForCountry = async (countryId) => {
    setLoadingStates(prev => ({ ...prev, [countryId]: true }))
    try {
      const statesData = await fetchStates(countryId)
      setStatesByCountry(prev => ({ ...prev, [countryId]: statesData }))
    } catch (error) {
      console.error('Failed to load states:', error)
    } finally {
      setLoadingStates(prev => ({ ...prev, [countryId]: false }))
    }
  }

  const loadCitiesForState = async (stateId) => {
    setLoadingCities(prev => ({ ...prev, [stateId]: true }))
    try {
      const citiesData = await fetchCities(stateId)
      setCitiesByState(prev => ({ ...prev, [stateId]: citiesData }))
    } catch (error) {
      console.error('Failed to load cities:', error)
    } finally {
      setLoadingCities(prev => ({ ...prev, [stateId]: false }))
    }
  }

  const loadCitiesForStateByName = async (stateName, countryName) => {
    try {
      // First, we need to find the state ID by loading states for the country
      const country = countries.find(c => c.name === countryName)
      if (!country) {
        console.error('Country not found:', countryName)
        alert(`Country "${countryName}" not found. Please try again.`)
        return
      }

      console.log('Loading states for country:', countryName, 'ID:', country.id)
      const statesData = await fetchStates(country.id)
      console.log('States data received:', statesData)

      const state = statesData.find(s => s.name === stateName)
      if (!state) {
        console.error('State not found:', stateName, 'Available states:', statesData.map(s => s.name))
        alert(`State "${stateName}" not found in ${countryName}. Available states: ${statesData.map(s => s.name).join(', ')}`)
        return
      }

      console.log('Loading cities for state:', stateName, 'ID:', state.id)
      const citiesData = await fetchCities(state.id)
      console.log('Cities data received:', citiesData)

      if (citiesData.length === 0) {
        alert(`No cities found for ${stateName}, ${countryName}. This might be because the API doesn't have city data for this state.`)
      }

      setCitiesByState(prev => ({ ...prev, [state.id]: citiesData }))
    } catch (error) {
      console.error('Failed to load cities:', error)
      alert(`Failed to load cities for ${stateName}, ${countryName}. Please check the console for more details.`)
    }
  }

  if (!field) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No Field Selected</h3>
          <p className="text-sm text-muted-foreground">Select a field from the canvas to configure its properties</p>
        </div>
      </div>
    )
  }

  const addOption = () => {
    if (!newOption.trim()) return
    const currentOptions = field.options || []
    onUpdateField(field.id, {
      options: [...currentOptions, newOption.trim()],
    })
    setNewOption("")
  }

  const removeOption = (index) => {
    const currentOptions = field.options || []
    const currentNestedFields = field.nestedFields || {}

    // Create new nested fields structure without the removed option
    const newNestedFields = {}
    Object.keys(currentNestedFields).forEach(key => {
      const optionIndex = parseInt(key)
      if (optionIndex < index) {
        // Keep nested fields for options before the removed one
        newNestedFields[key] = currentNestedFields[key]
      } else if (optionIndex > index) {
        // Shift nested fields for options after the removed one
        newNestedFields[optionIndex - 1] = currentNestedFields[key]
      }
      // Skip the removed option (optionIndex === index)
    })

    onUpdateField(field.id, {
      options: currentOptions.filter((_, i) => i !== index),
      nestedFields: newNestedFields
    })
  }

  const toggleNestedFields = (key) => {
    setExpandedNestedFields(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Helper function to deep clone nested fields structure
  const deepCloneNestedFields = (nestedFields) => {
    if (!nestedFields) return {}
    return JSON.parse(JSON.stringify(nestedFields))
  }

  // Helper function to update nested fields at any depth
  const updateNestedFieldAtPath = (nestedFields, path, updates) => {

    const cloned = deepCloneNestedFields(nestedFields)

    // Navigate to the target field
    let current = cloned
    for (let i = 0; i < path.length - 1; i += 2) {
      const optionIndex = path[i]
      const fieldIndex = path[i + 1]

      if (!current[optionIndex]) current[optionIndex] = []
      if (i + 2 < path.length - 1) {
        // Need to go deeper
        if (!current[optionIndex][fieldIndex].nestedFields) {
          current[optionIndex][fieldIndex].nestedFields = {}
        }
        current = current[optionIndex][fieldIndex].nestedFields
      }
    }

    const lastOptionIndex = path[path.length - 2]
    const lastFieldIndex = path[path.length - 1]

    if (!current[lastOptionIndex]) current[lastOptionIndex] = []

    // Apply updates
    if (updates === null) {
      // Remove field
      current[lastOptionIndex] = current[lastOptionIndex].filter((_, idx) => idx !== lastFieldIndex)
    } else if (typeof updates === 'function') {
      // Custom update function
      current[lastOptionIndex][lastFieldIndex] = updates(current[lastOptionIndex][lastFieldIndex])
    } else {
      // Merge updates
      current[lastOptionIndex][lastFieldIndex] = {
        ...current[lastOptionIndex][lastFieldIndex],
        ...updates
      }
    }

    return cloned
  }

  // Helper function to add nested field at any depth
  const addNestedFieldAtPath = (nestedFields, path, optionIndex) => {
    const cloned = deepCloneNestedFields(nestedFields)

    const newField = {
      id: `nested-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `nested_field_${Date.now()}`,
      type: "text",
      label: "Additional Field",
      placeholder: "",
      required: false
    }

    if (path.length === 0) {
      // Adding to root level - ensure we create proper arrays
      if (!cloned[optionIndex]) cloned[optionIndex] = []
      cloned[optionIndex].push(newField)
      return cloned
    }

    // Navigate to the target location
    let current = cloned
    for (let i = 0; i < path.length; i += 2) {
      const optIdx = path[i]
      const fieldIdx = path[i + 1]

      if (!current[optIdx]) current[optIdx] = []
      if (i + 2 < path.length) {
        if (!current[optIdx][fieldIdx].nestedFields) {
          current[optIdx][fieldIdx].nestedFields = {}
        }
        current = current[optIdx][fieldIdx].nestedFields
      } else {
        // This is the parent field where we want to add
        if (!current[optIdx][fieldIdx].nestedFields) {
          current[optIdx][fieldIdx].nestedFields = {}
        }
        if (!current[optIdx][fieldIdx].nestedFields[optionIndex]) {
          current[optIdx][fieldIdx].nestedFields[optionIndex] = []
        }
        current[optIdx][fieldIdx].nestedFields[optionIndex].push(newField)
      }
    }

    return cloned
  }

  // Memoized recursive component to render nested field configurations
  const NestedFieldConfig = memo(({
    nestedField,
    path = [],
    fieldId,
    nestedFields,
    onUpdateField,
    debouncedUpdateField,
    toggleNestedFields,
    setExpandedNestedFields,
    setForceRenderKey,
    countries,
    statesByCountry,
    citiesByState,
    loadingStates,
    loadingCities,
    manualCityInput,
    setManualCityInput,
    showManualCityInput,
    setShowManualCityInput,
    loadStatesForCountry,
    loadCitiesForStateByName
  }) => {
    const depth = path.length / 2
    const uniqueKey = path.join('-')

    // Local state for immediate UI feedback
    const [localLabel, setLocalLabel] = useState(nestedField.label)
    const [localPlaceholder, setLocalPlaceholder] = useState(nestedField.placeholder || "")
    const [localOptions, setLocalOptions] = useState(nestedField.options || [])
    const [localMinValue, setLocalMinValue] = useState(nestedField.validation?.min ?? "")
    const [localMaxValue, setLocalMaxValue] = useState(nestedField.validation?.max ?? "")

    // Refs to track internal updates and maintain focus
    const isInternalUpdateRef = useRef(false)
    const labelInputRef = useRef(null)
    const placeholderInputRef = useRef(null)
    const updateTimeouts = useRef({}) // Store timeouts for debounced updates

    // Sync local state with nestedField prop changes (only from external sources)
    useEffect(() => {
      if (!isInternalUpdateRef.current) {
        setLocalLabel(nestedField.label)
        setLocalPlaceholder(nestedField.placeholder || "")
        setLocalOptions(nestedField.options || [])
        setLocalMinValue(nestedField.validation?.min ?? "")
        setLocalMaxValue(nestedField.validation?.max ?? "")
      }
      isInternalUpdateRef.current = false
    }, [nestedField.label, nestedField.placeholder, nestedField.options, nestedField.validation?.min, nestedField.validation?.max])

    // Memoize the options to prevent unnecessary re-renders
    const memoizedOptions = useMemo(() => localOptions, [localOptions])

    // Cleanup timeouts on unmount
    useEffect(() => {
      return () => {
        Object.values(updateTimeouts.current).forEach(timeout => {
          if (timeout) clearTimeout(timeout)
        })
      }
    }, [])

    // Simple handler for field updates
    const handleFieldUpdate = useCallback((updates, useDebounce = false) => {

      const updatedNestedFields = updateNestedFieldAtPath(
        nestedFields || {},
        path,
        updates
      )

      if (useDebounce) {
        debouncedUpdateField(fieldId, { nestedFields: updatedNestedFields })
      } else {
        onUpdateField(fieldId, { nestedFields: updatedNestedFields })
      }
    }, [nestedFields, path, fieldId, debouncedUpdateField, onUpdateField])

    const handleFieldRemove = useCallback(() => {
      const updatedNestedFields = updateNestedFieldAtPath(
        nestedFields || {},
        path,
        null
      )
      onUpdateField(fieldId, { nestedFields: updatedNestedFields })
    }, [nestedFields, path, fieldId, onUpdateField])

    const handleAddNestedField = useCallback((optionIndex) => {
      const updatedNestedFields = addNestedFieldAtPath(
        nestedFields || {},
        path,
        optionIndex
      )
      onUpdateField(fieldId, { nestedFields: updatedNestedFields })
      // Ensure the nested fields section is open (don't toggle)
      const optionKey = `${uniqueKey}-opt-${optionIndex}`
      setExpandedNestedFields(prev => ({
        ...prev,
        [optionKey]: true
      }))
      // Force a re-render to immediately show the new nested field
      setForceRenderKey(prev => prev + 1)
      console.log('🔍 Added nested field at path:', path, 'option:', optionIndex, 'forcing UI update')
    }, [nestedFields, path, fieldId, onUpdateField, uniqueKey])

    const updateOption = useCallback((optionIndex, newValue) => {
      // Update local state immediately for UI responsiveness
      setLocalOptions(prev => {
        const newOptions = [...prev]
        newOptions[optionIndex] = newValue
        return newOptions
      })
    }, [])

    const updateOptionOnBlur = useCallback((optionIndex, newValue) => {
      // Update the actual field data only on blur
      const currentOptions = nestedField.options || []
      const newOptions = [...currentOptions]
      newOptions[optionIndex] = newValue
      handleFieldUpdate({ options: newOptions }, false)
    }, [nestedField.options, handleFieldUpdate])

    // Debounced update functions for min/max values
    const updateMinValue = useCallback((value) => {
      setLocalMinValue(value)

      // Clear existing timeout
      if (updateTimeouts.current.min) {
        clearTimeout(updateTimeouts.current.min)
      }

      // Set new timeout
      updateTimeouts.current.min = setTimeout(() => {
        const numValue = value === "" ? undefined : parseFloat(value)
        handleFieldUpdate({
          validation: {
            ...nestedField.validation,
            min: numValue
          }
        }, true) // Use debounced update
      }, 500) // 500ms delay
    }, [nestedField.validation, handleFieldUpdate])

    const updateMaxValue = useCallback((value) => {
      setLocalMaxValue(value)

      // Clear existing timeout
      if (updateTimeouts.current.max) {
        clearTimeout(updateTimeouts.current.max)
      }

      // Set new timeout
      updateTimeouts.current.max = setTimeout(() => {
        const numValue = value === "" ? undefined : parseFloat(value)
        handleFieldUpdate({
          validation: {
            ...nestedField.validation,
            max: numValue
          }
        }, true) // Use debounced update
      }, 500) // 500ms delay
    }, [nestedField.validation, handleFieldUpdate])

    const removeOptionAtIndex = useCallback((optionIndex) => {
      const currentOptions = nestedField.options || []
      const currentNestedFields = nestedField.nestedFields || {}

      // Update local state immediately
      setLocalOptions(prev => prev.filter((_, idx) => idx !== optionIndex))

      // Create new nested fields structure without the removed option
      const newNestedFields = {}
      Object.keys(currentNestedFields).forEach(key => {
        const optIndex = parseInt(key)
        if (optIndex < optionIndex) {
          // Keep nested fields for options before the removed one
          newNestedFields[key] = currentNestedFields[key]
        } else if (optIndex > optionIndex) {
          // Shift nested fields for options after the removed one
          newNestedFields[optIndex - 1] = currentNestedFields[key]
        }
        // Skip the removed option (optIndex === optionIndex)
      })

      const newOptions = currentOptions.filter((_, idx) => idx !== optionIndex)
      isInternalUpdateRef.current = true
      handleFieldUpdate({
        options: newOptions,
        nestedFields: newNestedFields
      })
    }, [nestedField.options, nestedField.nestedFields, handleFieldUpdate])

    const addNewOption = useCallback(() => {
      const currentOptions = nestedField.options || []
      const newOption = `Option ${currentOptions.length + 1}`

      // Update local state immediately
      setLocalOptions(prev => [...prev, newOption])

      // Update the actual field data
      handleFieldUpdate({ options: [...currentOptions, newOption] })
    }, [nestedField.options, handleFieldUpdate])

    const borderColors = ['border-primary/20', 'border-blue-300/30', 'border-green-300/30', 'border-purple-300/30', 'border-orange-300/30']
    const bgColors = ['bg-background/50', 'bg-blue-50/50', 'bg-green-50/50', 'bg-purple-50/50', 'bg-orange-50/50']
    const borderColor = borderColors[Math.min(depth, borderColors.length - 1)]
    const bgColor = bgColors[Math.min(depth, bgColors.length - 1)]

    return (
      <div className={`p-3 border rounded-lg space-y-3 w-full min-w-0 overflow-hidden ${bgColor}`}>
        <div className="flex items-center justify-between min-w-0">
          <Badge variant="outline" className="text-xs flex-shrink-0">
            Field {path[path.length - 1] + 1} {depth > 0 && `(Level ${depth + 1})`}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 ml-2"
            onClick={handleFieldRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Field Label</Label>
            <Input
              ref={labelInputRef}
              value={localLabel}
              onChange={(e) => {
                const value = e.target.value
                setLocalLabel(value)
                // Only update local state, no field data update during typing
              }}
              onBlur={(e) => {
                // Update field data only on blur
                if (e.target.value !== nestedField.label) {
                  isInternalUpdateRef.current = true
                  handleFieldUpdate({ label: e.target.value }, false)
                }
              }}
              placeholder="Enter field label"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Field Type</Label>
            <Select
              value={nestedField.type}
              onValueChange={(value) => {
                const updates = { type: value }
                if (["checkbox", "radio", "select"].includes(value) && !nestedField.options) {
                  updates.options = ["Option 1", "Option 2", "Option 3"]
                  // Set local state immediately for new options
                  setLocalOptions(["Option 1", "Option 2", "Option 3"])
                }
                handleFieldUpdate(updates)
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Input</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="textarea">Textarea</SelectItem>
                <SelectItem value="select">Select Dropdown</SelectItem>
                <SelectItem value="checkbox">Checkbox Group</SelectItem>
                <SelectItem value="radio">Radio Group</SelectItem>
                <SelectItem value="file">File Upload</SelectItem>
                <SelectItem value="datetime">Date & Time</SelectItem>
                <SelectItem value="phone">Phone Number</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Placeholder</Label>
            <Input
              ref={placeholderInputRef}
              value={localPlaceholder}
              onChange={(e) => {
                const value = e.target.value
                setLocalPlaceholder(value)
                // Only update local state, no field data update during typing
              }}
              onBlur={(e) => {
                // Update field data only on blur
                if (e.target.value !== (nestedField.placeholder || "")) {
                  isInternalUpdateRef.current = true
                  handleFieldUpdate({ placeholder: e.target.value }, false)
                }
              }}
              placeholder="Enter placeholder text"
              className="h-8 text-sm"
            />
          </div>

          {/* Required field validation removed for nested fields - only parent form validation applies */}

          {/* Options for select, checkbox, radio */}
          {["select", "checkbox", "radio"].includes(nestedField.type) && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium text-muted-foreground">Options</Label>
              <div className="space-y-2">
                {memoizedOptions?.map((option, optionIndex) => {
                  const optionKey = `${uniqueKey}-opt-${optionIndex}`
                  const hasNestedFields = nestedField.nestedFields?.[optionIndex]?.length > 0

                  return (
                    <div key={`option-${optionIndex}`} className="space-y-2 w-full min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Input
                          value={typeof option === 'string' ? option : option?.label || option?.value || ''}
                          onChange={(e) => {
                            const newValue = e.target.value

                            // If option is an object, update both value and label
                            if (typeof option === 'object' && option !== null) {
                              updateOption(optionIndex, {
                                value: newValue,
                                label: newValue,
                                nestedFields: option.nestedFields || []
                              })
                            } else {
                              updateOption(optionIndex, newValue)
                            }
                          }}
                          onBlur={(e) => {
                            const newValue = e.target.value
                            if (typeof option === 'object' && option !== null) {
                              updateOptionOnBlur(optionIndex, {
                                value: newValue,
                                label: newValue,
                                nestedFields: option.nestedFields || []
                              })
                            } else {
                              updateOptionOnBlur(optionIndex, newValue)
                            }
                          }}
                          placeholder={`Option ${optionIndex + 1}`}
                          className="h-7 text-xs flex-1 min-w-0"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={() => removeOptionAtIndex(optionIndex)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Add nested fields controls */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs min-w-0 flex-shrink-0"
                          onClick={() => toggleNestedFields(optionKey)}
                        >
                          {expandedNestedFields[optionKey] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          Nested Fields
                          {hasNestedFields && (
                            <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0">
                              {nestedField.nestedFields[optionIndex].length}
                            </Badge>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs flex-shrink-0"
                          onClick={() => handleAddNestedField(optionIndex)}
                        >
                          <Plus className="h-3 w-3" />
                          Add Field
                        </Button>
                      </div>

                      {/* Render nested fields recursively */}
                      {expandedNestedFields[optionKey] && (
                        <div className="ml-4 space-y-3 w-full min-w-0" key={`nested-recursive-${optionKey}-${forceRenderKey}`}>
                          {nestedField.nestedFields?.[optionIndex]?.map((childField, childIndex) => (
                            <NestedFieldConfig
                              key={childField.id}
                              nestedField={childField}
                              path={[...path, optionIndex, childIndex]}
                              fieldId={field.id}
                              nestedFields={field.nestedFields}
                              onUpdateField={onUpdateField}
                              debouncedUpdateField={debouncedUpdateField}
                              toggleNestedFields={toggleNestedFields}
                              setExpandedNestedFields={setExpandedNestedFields}
                              setForceRenderKey={setForceRenderKey}
                              countries={countries}
                              statesByCountry={statesByCountry}
                              citiesByState={citiesByState}
                              loadingStates={loadingStates}
                              loadingCities={loadingCities}
                              manualCityInput={manualCityInput}
                              setManualCityInput={setManualCityInput}
                              showManualCityInput={showManualCityInput}
                              setShowManualCityInput={setShowManualCityInput}
                              loadStatesForCountry={loadStatesForCountry}
                              loadCitiesForStateByName={loadCitiesForStateByName}
                            />
                          ))}
                          {!hasNestedFields && (
                            <div className="text-center py-4 text-muted-foreground text-xs border-2 border-dashed rounded-lg bg-muted/20 w-full min-w-0">
                              <div className="flex flex-col items-center gap-1">
                                <Settings2 className="h-3 w-3" />
                                <span>No fields yet</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={addNewOption}
                >
                  <Plus className="h-3 w-3" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* File Type Configuration for nested fields */}
          {nestedField.type === "file" && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium text-muted-foreground">File Type</Label>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Allowed File Types</Label>
                <Select
                  value={nestedField.validation?.fileType || "both"}
                  onValueChange={(value) =>
                    handleFieldUpdate({
                      validation: {
                        ...nestedField.validation,
                        fileType: value
                      }
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="images">Images Only</SelectItem>
                    <SelectItem value="pdf">PDF Only</SelectItem>
                    <SelectItem value="both">Images & PDF</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {nestedField.validation?.fileType === "images" && "Accepts: JPEG, PNG, GIF, WebP, SVG"}
                  {nestedField.validation?.fileType === "pdf" && "Accepts: PDF files only"}
                  {nestedField.validation?.fileType === "both" && "Accepts: Images (JPEG, PNG, GIF, WebP, SVG) and PDF files"}
                  {!nestedField.validation?.fileType && "Accepts: Images (JPEG, PNG, GIF, WebP, SVG) and PDF files"}
                </p>
              </div>
            </div>
          )}

          {/* Location Configuration for nested fields */}
          {nestedField.type === "location" && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium text-muted-foreground">Location Restrictions</Label>

              {/* Allowed Countries */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Allowed Countries</Label>
                <div className="space-y-1">
                  {nestedField.validation?.allowedCountries?.map((countryName, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-xs">{countryName}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const currentAllowed = nestedField.validation?.allowedCountries || []
                          const newAllowed = currentAllowed.filter(c => c !== countryName)

                          // Also remove states and cities for this country
                          const newAllowedStates = { ...nestedField.validation?.allowedStates }
                          const newAllowedCities = { ...nestedField.validation?.allowedCities }
                          delete newAllowedStates[countryName]

                          // Remove cities for states of this country
                          Object.keys(newAllowedCities).forEach(state => {
                            if (newAllowedStates[state]) {
                              delete newAllowedCities[state]
                            }
                          })

                          handleFieldUpdate({
                            validation: {
                              ...nestedField.validation,
                              allowedCountries: newAllowed,
                              allowedStates: newAllowedStates,
                              allowedCities: newAllowedCities
                            }
                          })
                        }}
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  ))}

                  <Select onValueChange={(countryId) => {
                    const country = countries.find(c => c.id === parseInt(countryId))
                    if (country) {
                      const currentAllowed = nestedField.validation?.allowedCountries || []
                      if (!currentAllowed.includes(country.name)) {
                        handleFieldUpdate({
                          validation: {
                            ...nestedField.validation,
                            allowedCountries: [...currentAllowed, country.name]
                          }
                        })
                      }
                    }
                  }}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Add country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries
                        .filter(country => !nestedField.validation?.allowedCountries?.includes(country.name))
                        .map(country => (
                          <SelectItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Allowed States */}
              {nestedField.validation?.allowedCountries?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Allowed States</Label>
                  {nestedField.validation.allowedCountries.map(countryName => {
                    const country = countries.find(c => c.name === countryName)
                    if (!country) return null

                    return (
                      <div key={countryName} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">{countryName}</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadStatesForCountry(country.id)}
                            disabled={loadingStates[country.id]}
                            className="h-6 text-xs"
                          >
                            {loadingStates[country.id] ? "Loading..." : "Load States"}
                          </Button>
                        </div>

                        <div className="space-y-1">
                          {(nestedField.validation?.allowedStates?.[countryName] || []).map((stateName, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                              <span className="text-xs">{stateName}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const currentAllowedStates = nestedField.validation?.allowedStates || {}
                                  const countryStates = (currentAllowedStates[countryName] || []).filter(s => s !== stateName)

                                  // Also remove cities for this state
                                  const newAllowedCities = { ...nestedField.validation?.allowedCities }
                                  delete newAllowedCities[stateName]

                                  handleFieldUpdate({
                                    validation: {
                                      ...nestedField.validation,
                                      allowedStates: {
                                        ...currentAllowedStates,
                                        [countryName]: countryStates
                                      },
                                      allowedCities: newAllowedCities
                                    }
                                  })
                                }}
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                          ))}

                          {statesByCountry[country.id]?.length > 0 && (
                            <Select onValueChange={(stateId) => {
                              const state = statesByCountry[country.id].find(s => s.id === parseInt(stateId))
                              if (state) {
                                const currentAllowedStates = nestedField.validation?.allowedStates || {}
                                const countryStates = currentAllowedStates[countryName] || []

                                if (!countryStates.includes(state.name)) {
                                  handleFieldUpdate({
                                    validation: {
                                      ...nestedField.validation,
                                      allowedStates: {
                                        ...currentAllowedStates,
                                        [countryName]: [...countryStates, state.name]
                                      }
                                    }
                                  })
                                }
                              }
                            }}>
                              <SelectTrigger className="h-6 text-xs">
                                <SelectValue placeholder="Add state" />
                              </SelectTrigger>
                              <SelectContent>
                                {statesByCountry[country.id]
                                  .filter(state => !nestedField.validation?.allowedStates?.[countryName]?.includes(state.name))
                                  .map(state => (
                                    <SelectItem key={state.id} value={state.id.toString()}>
                                      {state.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Allowed Cities */}
              {Object.keys(nestedField.validation?.allowedStates || {}).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Allowed Cities</Label>
                  {Object.entries(nestedField.validation?.allowedStates || {}).map(([countryName, stateNames]) =>
                    stateNames.map(stateName => {
                      const country = countries.find(c => c.name === countryName)
                      if (!country) return null

                      // Find the state object from the loaded states for this country
                      const state = statesByCountry[country.id]?.find(s => s.name === stateName)

                      return (
                        <div key={`${countryName}-${stateName}`} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">{stateName}, {countryName}</Label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadCitiesForStateByName(stateName, countryName)}
                              disabled={state ? loadingCities[state.id] : false}
                              className="h-6 text-xs"
                            >
                              {state && loadingCities[state.id] ? "Loading..." : "Load Cities"}
                            </Button>
                          </div>

                          <div className="space-y-1">
                            {(nestedField.validation?.allowedCities?.[stateName] || []).map((cityName, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                <span className="text-xs">{cityName}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const currentAllowedCities = nestedField.validation?.allowedCities || {}
                                    const stateCities = (currentAllowedCities[stateName] || []).filter(c => c !== cityName)

                                    handleFieldUpdate({
                                      validation: {
                                        ...nestedField.validation,
                                        allowedCities: {
                                          ...currentAllowedCities,
                                          [stateName]: stateCities
                                        }
                                      }
                                    })
                                  }}
                                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                >
                                  <X className="h-2 w-2" />
                                </Button>
                              </div>
                            ))}

                            {state && citiesByState[state.id]?.length > 0 && (
                              <Select onValueChange={(cityId) => {
                                const city = citiesByState[state.id].find(c => c.id === parseInt(cityId))
                                if (city) {
                                  const currentAllowedCities = nestedField.validation?.allowedCities || {}
                                  const stateCities = currentAllowedCities[stateName] || []

                                  if (!stateCities.includes(city.name)) {
                                    handleFieldUpdate({
                                      validation: {
                                        ...nestedField.validation,
                                        allowedCities: {
                                          ...currentAllowedCities,
                                          [stateName]: [...stateCities, city.name]
                                        }
                                      }
                                    })
                                  }
                                }
                              }}>
                                <SelectTrigger className="h-6 text-xs">
                                  <SelectValue placeholder="Add city" />
                                </SelectTrigger>
                                <SelectContent>
                                  {citiesByState[state.id]
                                    .filter(city => !nestedField.validation?.allowedCities?.[stateName]?.includes(city.name))
                                    .map(city => (
                                      <SelectItem key={city.id} value={city.id.toString()}>
                                        {city.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* Manual city input fallback */}
                            <div className="space-y-1">
                              {state && !showManualCityInput[state.id] ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowManualCityInput(prev => ({ ...prev, [state.id]: true }))}
                                  className="h-6 text-xs"
                                >
                                  Add City Manually
                                </Button>
                              ) : state && showManualCityInput[state.id] ? (
                                <div className="flex gap-1">
                                  <Input
                                    value={manualCityInput}
                                    onChange={(e) => setManualCityInput(e.target.value)}
                                    placeholder="Enter city name"
                                    className="h-6 text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (!manualCityInput.trim()) return

                                        const currentAllowedCities = nestedField.validation?.allowedCities || {}
                                        const stateCities = currentAllowedCities[stateName] || []

                                        if (!stateCities.includes(manualCityInput.trim())) {
                                          handleFieldUpdate({
                                            validation: {
                                              ...nestedField.validation,
                                              allowedCities: {
                                                ...currentAllowedCities,
                                                [stateName]: [...stateCities, manualCityInput.trim()]
                                              }
                                            }
                                          })
                                        }

                                        setManualCityInput("")
                                        setShowManualCityInput(prev => ({ ...prev, [state.id]: false }))
                                      } else if (e.key === 'Escape') {
                                        setShowManualCityInput(prev => ({ ...prev, [state.id]: false }))
                                        setManualCityInput("")
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (!manualCityInput.trim()) return

                                      const currentAllowedCities = nestedField.validation?.allowedCities || {}
                                      const stateCities = currentAllowedCities[stateName] || []

                                      if (!stateCities.includes(manualCityInput.trim())) {
                                        handleFieldUpdate({
                                          validation: {
                                            ...nestedField.validation,
                                            allowedCities: {
                                              ...currentAllowedCities,
                                              [stateName]: [...stateCities, manualCityInput.trim()]
                                            }
                                          }
                                        })
                                      }

                                      setManualCityInput("")
                                      setShowManualCityInput(prev => ({ ...prev, [state.id]: false }))
                                    }}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Add
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShowManualCityInput(prev => ({ ...prev, [state.id]: false }))
                                      setManualCityInput("")
                                    }}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  Load cities first to add manually
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Number Field Configuration for nested fields */}
          {nestedField.type === "number" && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium text-muted-foreground">Number Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Minimum Value</Label>
                  <Input
                    type="number"
                    value={localMinValue}
                    onChange={(e) => updateMinValue(e.target.value)}
                    placeholder="No minimum"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Maximum Value</Label>
                  <Input
                    type="number"
                    value={localMaxValue}
                    onChange={(e) => updateMaxValue(e.target.value)}
                    placeholder="No maximum"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              {(nestedField.validation?.min !== undefined || nestedField.validation?.max !== undefined) && (
                <p className="text-xs text-muted-foreground">
                  {nestedField.validation?.min !== undefined && nestedField.validation?.max !== undefined
                    ? `Accepted range: ${nestedField.validation.min} to ${nestedField.validation.max}`
                    : nestedField.validation?.min !== undefined
                      ? `Minimum value: ${nestedField.validation.min}`
                      : `Maximum value: ${nestedField.validation.max}`
                  }
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.nestedField.id === nextProps.nestedField.id &&
      prevProps.nestedField.label === nextProps.nestedField.label &&
      prevProps.nestedField.placeholder === nextProps.nestedField.placeholder &&
      prevProps.nestedField.type === nextProps.nestedField.type &&
      prevProps.nestedField.required === nextProps.nestedField.required &&
      JSON.stringify(prevProps.nestedField.options) === JSON.stringify(nextProps.nestedField.options) &&
      JSON.stringify(prevProps.nestedField.validation) === JSON.stringify(nextProps.nestedField.validation) &&
      prevProps.fieldId === nextProps.fieldId &&
      JSON.stringify(prevProps.path) === JSON.stringify(nextProps.path)
    )
  })

  const needsOptions = ["select", "checkbox", "radio"].includes(field.type)

  return (
    <div className="h-full overflow-y-auto">
      {/* Field Header */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-medium text-sm truncate">{field.label}</h3>
          <Badge variant="secondary" className="text-xs font-mono">
            {field.type}
          </Badge>
        </div>
        <div className="flex gap-1 mt-1">
          {field.required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
          {field.type === "select" && field.validation?.multiple && (
            <Badge variant="outline" className="text-xs">
              Multiple Selection
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Properties */}
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="px-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Basic Properties
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-label" className="text-sm font-medium">
                Label
              </Label>
              <Input
                id="field-label"
                value={field.label}
                onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
                placeholder="Field label"
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-placeholder" className="text-sm font-medium">
                Placeholder
              </Label>
              <Input
                id="field-placeholder"
                value={field.placeholder || ""}
                onChange={(e) => onUpdateField(field.id, { placeholder: e.target.value })}
                placeholder="Placeholder text"
                className="bg-input"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="field-required" className="text-sm font-medium">
                Required Field
              </Label>
              <Switch
                id="field-required"
                checked={field.required || false}
                onCheckedChange={(checked) => onUpdateField(field.id, {
                  required: checked,
                  validation: {
                    ...field.validation,
                    required: checked
                  }
                })}
              />
            </div>

            {field.source !== 'table' && (
              <div className="flex items-center justify-between">
                <Label htmlFor="field-isleadcolumn" className="text-sm font-medium">
                  Add to Lead Database
                </Label>
                <Checkbox
                  id="field-isleadcolumn"
                  checked={field.isLeadColumn || false}
                  onCheckedChange={(checked) => onUpdateField(field.id, {
                    isLeadColumn: checked
                  })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Options for select, checkbox, radio */}
        {needsOptions && (
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Options
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              <div className="space-y-3">
                {field.options?.map((option, index) => {
                  const rootKey = `root-${index}`
                  const hasNestedFields = field.nestedFields?.[index]?.length > 0

                  return (
                    <Fragment key={index}>
                      <div className="space-y-3 border rounded-lg p-3 bg-muted/20 w-full min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                            {index + 1}
                          </div>
                          <Input
                            value={typeof option === 'string' ? option : option?.label || option?.value || ''}
                            onChange={(e) => {
                              const newOptions = [...(field.options || [])]
                              const newValue = e.target.value

                              // If option is an object, update both value and label
                              if (typeof option === 'object' && option !== null) {
                                newOptions[index] = {
                                  value: newValue,
                                  label: newValue,
                                  nestedFields: option.nestedFields || []
                                }
                              } else {
                                newOptions[index] = newValue
                              }

                              onUpdateField(field.id, { options: newOptions })
                            }}
                            className="bg-input flex-1 min-w-0"
                            placeholder={`Option ${index + 1}`}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            onClick={() => removeOption(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Nested Fields Section */}
                        <div className="space-y-3 w-full min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleNestedFields(rootKey)}
                              className="text-xs gap-1 h-7 hover:bg-accent/50 flex-shrink-0 min-w-0"
                            >
                              {expandedNestedFields[rootKey] ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              Additional Fields
                              {hasNestedFields && (
                                <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0">
                                  {field.nestedFields[index].length}
                                </Badge>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const updatedNestedFields = addNestedFieldAtPath(
                                  field.nestedFields || {},
                                  [],
                                  index
                                )
                                onUpdateField(field.id, { nestedFields: updatedNestedFields })
                                // Ensure the nested fields section is open (don't toggle)
                                setExpandedNestedFields(prev => ({
                                  ...prev,
                                  [rootKey]: true
                                }))
                                // Force a re-render to immediately show the new nested field
                                setForceRenderKey(prev => prev + 1)
                                console.log('🔍 Added nested field to root level, forcing UI update')
                              }}
                              className="h-7 text-xs gap-1 hover:bg-accent/50 flex-shrink-0"
                            >
                              <Plus className="h-3 w-3" />
                              Add Field
                            </Button>
                          </div>

                          {expandedNestedFields[rootKey] && (
                            <div className="space-y-3 w-full min-w-0" key={`nested-container-${rootKey}-${forceRenderKey}`}>
                              {field.nestedFields?.[index]?.map((nestedField, nestedIndex) => (
                                <NestedFieldConfig
                                  key={nestedField.id}
                                  nestedField={nestedField}
                                  path={[index, nestedIndex]}
                                  fieldId={field.id}
                                  nestedFields={field.nestedFields}
                                  onUpdateField={onUpdateField}
                                  debouncedUpdateField={debouncedUpdateField}
                                  toggleNestedFields={toggleNestedFields}
                                  setExpandedNestedFields={setExpandedNestedFields}
                                  setForceRenderKey={setForceRenderKey}
                                  countries={countries}
                                  statesByCountry={statesByCountry}
                                  citiesByState={citiesByState}
                                  loadingStates={loadingStates}
                                  loadingCities={loadingCities}
                                  manualCityInput={manualCityInput}
                                  setManualCityInput={setManualCityInput}
                                  showManualCityInput={showManualCityInput}
                                  setShowManualCityInput={setShowManualCityInput}
                                  loadStatesForCountry={loadStatesForCountry}
                                  loadCitiesForStateByName={loadCitiesForStateByName}
                                />
                              ))}

                              {!hasNestedFields && (
                                <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-muted/20 w-full min-w-0">
                                  <div className="flex flex-col items-center gap-2">
                                    <Settings2 className="h-4 w-4" />
                                    <span>No additional fields for this option</span>
                                    <span className="text-xs">Click "Add Field" to create conditional fields</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Fragment>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add new option"
                  className="bg-input flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addOption()
                    }
                  }}
                />
                <Button size="sm" onClick={addOption} className="px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <span className="font-bold text-purple-600">Tip:</span> You can add nested fields to each option.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Select: Multiple toggle */}
        {field.type === "select" && (
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Selection Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="field-multiple-select" className="text-sm font-medium">
                  Allow Multiple Selection
                </Label>
                <Switch
                  id="field-multiple-select"
                  checked={field.validation?.multiple || false}
                  onCheckedChange={(checked) =>
                    onUpdateField(field.id, {
                      validation: {
                        ...field.validation,
                        multiple: checked
                      }
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Number: Min/Max validation */}
        {field.type === "number" && (
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Number Validation
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="field-min" className="text-xs">
                    Min Value
                  </Label>
                  <Input
                    id="field-min"
                    type="number"
                    value={field.validation?.min || ""}
                    onChange={(e) =>
                      onUpdateField(field.id, {
                        validation: {
                          ...field.validation,
                          min: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="bg-input"
                    placeholder="No limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-max" className="text-xs">
                    Max Value
                  </Label>
                  <Input
                    id="field-max"
                    type="number"
                    value={field.validation?.max || ""}
                    onChange={(e) =>
                      onUpdateField(field.id, {
                        validation: {
                          ...field.validation,
                          max: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="bg-input"
                    placeholder="No limit"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* File: Type validation */}
        {field.type === "file" && (
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                File Type
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="field-file-type" className="text-sm font-medium">
                  Allowed File Types
                </Label>
                <Select
                  value={field.validation?.fileType || "both"}
                  onValueChange={(value) =>
                    onUpdateField(field.id, {
                      validation: {
                        ...field.validation,
                        fileType: value
                      }
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="images">Images Only</SelectItem>
                    <SelectItem value="pdf">PDF Only</SelectItem>
                    <SelectItem value="both">Images & PDF</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {field.validation?.fileType === "images" && "Accepts: JPEG, PNG, GIF, WebP, SVG"}
                  {field.validation?.fileType === "pdf" && "Accepts: PDF files only"}
                  {field.validation?.fileType === "both" && "Accepts: Images (JPEG, PNG, GIF, WebP, SVG) and PDF files"}
                  {!field.validation?.fileType && "Accepts: Images (JPEG, PNG, GIF, WebP, SVG) and PDF files"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table Column Selector */}
        {field.type === "table_column" && (
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Table Columns
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <TableColumnSelector
                field={field}
                onUpdateField={onUpdateField}
                existingFields={allFields}
              />
            </CardContent>
          </Card>
        )}

        {/* Location Configuration */}
        {field.type === "location" && (
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Location Restrictions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              {/* Allowed Countries */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Allowed Countries</Label>
                <div className="space-y-2">
                  {field.validation?.allowedCountries?.map((countryName, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm">{countryName}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAllowedCountry(countryName)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  <Select onValueChange={(countryId) => {
                    const country = countries.find(c => c.id === parseInt(countryId))
                    if (country) {
                      addAllowedCountry(country.name)
                    }
                  }}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Add country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries
                        .filter(country => !field.validation?.allowedCountries?.includes(country.name))
                        .map(country => (
                          <SelectItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Allowed States */}
              {field.validation?.allowedCountries?.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Allowed States</Label>
                  {field.validation.allowedCountries.map(countryName => {
                    const country = countries.find(c => c.name === countryName)
                    if (!country) return null

                    return (
                      <div key={countryName} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">{countryName}</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadStatesForCountry(country.id)}
                            disabled={loadingStates[country.id]}
                            className="h-6 text-xs"
                          >
                            {loadingStates[country.id] ? "Loading..." : "Load States"}
                          </Button>
                        </div>

                        <div className="space-y-1">
                          {(field.validation?.allowedStates?.[countryName] || []).map((stateName, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                              <span className="text-xs">{stateName}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAllowedState(countryName, stateName)}
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                          ))}

                          {statesByCountry[country.id]?.length > 0 && (
                            <Select onValueChange={(stateId) => {
                              const state = statesByCountry[country.id].find(s => s.id === parseInt(stateId))
                              if (state) {
                                addAllowedState(countryName, state.name)
                              }
                            }}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Add state" />
                              </SelectTrigger>
                              <SelectContent>
                                {statesByCountry[country.id]
                                  .filter(state => !field.validation?.allowedStates?.[countryName]?.includes(state.name))
                                  .map(state => (
                                    <SelectItem key={state.id} value={state.id.toString()}>
                                      {state.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Allowed Cities */}
              {Object.keys(field.validation?.allowedStates || {}).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Allowed Cities</Label>
                  {Object.entries(field.validation?.allowedStates || {}).map(([countryName, stateNames]) =>
                    stateNames.map(stateName => {
                      const country = countries.find(c => c.name === countryName)
                      if (!country) return null

                      // Find the state object from the loaded states for this country
                      const state = statesByCountry[country.id]?.find(s => s.name === stateName)

                      return (
                        <div key={`${countryName}-${stateName}`} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">{stateName}, {countryName}</Label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadCitiesForStateByName(stateName, countryName)}
                              disabled={state ? loadingCities[state.id] : false}
                              className="h-6 text-xs"
                            >
                              {state && loadingCities[state.id] ? "Loading..." : "Load Cities"}
                            </Button>
                          </div>

                          <div className="space-y-1">
                            {(field.validation?.allowedCities?.[stateName] || []).map((cityName, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                <span className="text-xs">{cityName}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeAllowedCity(stateName, cityName)}
                                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                >
                                  <X className="h-2 w-2" />
                                </Button>
                              </div>
                            ))}

                            {state && citiesByState[state.id]?.length > 0 && (
                              <Select onValueChange={(cityId) => {
                                const city = citiesByState[state.id].find(c => c.id === parseInt(cityId))
                                if (city) {
                                  addAllowedCity(stateName, city.name)
                                }
                              }}>
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Add city" />
                                </SelectTrigger>
                                <SelectContent>
                                  {citiesByState[state.id]
                                    .filter(city => !field.validation?.allowedCities?.[stateName]?.includes(city.name))
                                    .map(city => (
                                      <SelectItem key={city.id} value={city.id.toString()}>
                                        {city.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* Manual city input fallback */}
                            <div className="space-y-2">
                              {state && !showManualCityInput[state.id] ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowManualCityInput(prev => ({ ...prev, [state.id]: true }))}
                                  className="h-6 text-xs"
                                >
                                  Add City Manually
                                </Button>
                              ) : state && showManualCityInput[state.id] ? (
                                <div className="flex gap-1">
                                  <Input
                                    value={manualCityInput}
                                    onChange={(e) => setManualCityInput(e.target.value)}
                                    placeholder="Enter city name"
                                    className="h-6 text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        addManualCity(stateName)
                                      } else if (e.key === 'Escape') {
                                        setShowManualCityInput(prev => ({ ...prev, [state.id]: false }))
                                        setManualCityInput("")
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => addManualCity(stateName)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Add
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShowManualCityInput(prev => ({ ...prev, [state.id]: false }))
                                      setManualCityInput("")
                                    }}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  Load cities first to add manually
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}