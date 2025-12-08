"use client"

import { useForm } from "@tanstack/react-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Send, ArrowLeft, Building, User, Save, Edit, FileText, Trash2, Lock, Pause } from "lucide-react"
import { FieldRenderer } from "../../component/formbuilder/field-renderer"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import axios from "axios"
import Link from "next/link"
import Image from "next/image"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { fetchPhoneCountries } from "@/lib/constants/location-api"
import { v4 as uuidv4 } from 'uuid';
import { authUtils } from '@/lib/auth-utils'

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const ORGANIZATION_ID = process.env.NEXT_PUBLIC_ORGANIZATION_ID
const TABLE_ID = process.env.NEXT_PUBLIC_TABLE_ID
const FALLBACK_USER_ID = process.env.NEXT_PUBLIC_USER_ID

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Improved base64 detection
const isBase64File = (str) => {
  if (typeof str !== 'string') return false
  return str.startsWith('data:') && str.includes('base64,')
}

// Create a proper file object from base64
const createFileFromBase64 = (base64String, filename = 'uploaded_file', originalType = null, originalSize = null, originalLastModified = null) => {
  if (!base64String) return null

  try {
    // Extract mime type and base64 data
    const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/)
    if (!matches || matches.length !== 3) {
      console.warn('Invalid base64 format:', base64String?.substring(0, 100))
      return null
    }

    const mimeType = matches[1]
    const base64Data = matches[2]

    // Use original metadata if provided, otherwise use extracted/default values
    const finalFilename = filename.includes('.') ? filename : `${filename}.${mimeType.split('/')[1] || 'bin'}`
    const finalType = originalType || mimeType
    const finalSize = originalSize || Math.floor((base64Data.length * 3) / 4)
    const finalLastModified = originalLastModified || Date.now()

    return {
      name: finalFilename,
      type: finalType,
      size: finalSize,
      base64: base64String,
      previewUrl: base64String,
      lastModified: finalLastModified,
      isFromBase64: true // Flag to identify base64-originated files
    }
  } catch (error) {
    console.error('Error creating file from base64:', error)
    return null
  }
}

// Helper function to recursively process nested fields structure
const processNestedFieldsRecursively = (nestedFields) => {
  if (!Array.isArray(nestedFields)) return []

  return nestedFields.map(nestedField => {
    const processedField = {
      id: nestedField.id,
      name: nestedField.name,
      type: nestedField.type,
      label: nestedField.label,
      placeholder: nestedField.placeholder || '',
      required: nestedField.required || false,
      validation: nestedField.validation || {},
      options: nestedField.options || []
    }

    // Recursively process nested fields within this field
    if (nestedField.nestedFields && Array.isArray(nestedField.nestedFields)) {
      processedField.nestedFields = processNestedFieldsRecursively(nestedField.nestedFields)
    } else {
      processedField.nestedFields = []
    }

    return processedField
  })
}

// Helper function to process field options with nested structure
const processFieldOptions = (field) => {
  // If we have processed options with nested structure, use those
  if (field._processedOptions && Array.isArray(field._processedOptions)) {
    return field._processedOptions.map(option => {
      if (typeof option === 'object' && option !== null) {
        return {
          value: option.value,
          label: option.label,
          nestedFields: option.nestedFields || []
        }
      } else {
        return option
      }
    })
  }


  // Handle options that might be stored as JSON strings (from API)
  let options = field.options || []

  if (typeof options === 'string') {
    try {
      options = JSON.parse(options)
    } catch (e) {
      console.warn('Failed to parse options JSON string:', options)
      return []
    }
  }

  // If options is an array, process each option
  if (Array.isArray(options)) {
    return options.map((option, index) => {
      if (typeof option === 'object' && option !== null) {
        // Prioritize option.nestedFields if they exist (for table columns and new structure)
        if (option.nestedFields && Array.isArray(option.nestedFields) && option.nestedFields.length > 0) {
          return {
            value: option.value,
            label: option.label,
            nestedFields: processNestedFieldsRecursively(option.nestedFields)
          }
        }

        // Fallback to field.nestedFields[index] for old form builder structure
        if (field.nestedFields && field.nestedFields[index]) {
          return {
            value: option.value,
            label: option.label,
            nestedFields: processNestedFieldsRecursively(field.nestedFields[index])
          }
        }

        return {
          value: option.value,
          label: option.label,
          nestedFields: []
        }
      } else {
        // Handle string options - check if there are nested fields for this index
        if (field.nestedFields && field.nestedFields[index]) {
          return {
            value: option,
            label: option,
            nestedFields: processNestedFieldsRecursively(field.nestedFields[index])
          }
        }
        return option
      }
    })
  }

  return []
}

// Helper function to validate if a string is a valid UUID
const isValidUUID = (str) => {
  if (!str || typeof str !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Transform form values for API submission - FIXED VERSION
const transformFormValues = (formValues, fields, phoneCountries = []) => {
  const transformedValues = {}

  // Helper to check if a value is empty/invalid for backend submission
  const isEmptyValue = (value) => {
    if (value === null || value === undefined) return true
    if (Array.isArray(value) && value.length === 0) return true
    if (typeof value === 'string' && value.trim() === '') return true
    return false
  }

  // Helper function to recursively transform nested values using field IDs
  const transformNestedValues = (nestedFields, parentValue, fieldDefinition, depth = 0) => {
    const result = {}

    // Prevent infinite recursion
    if (depth > 10) {
      console.warn('Maximum nested field depth exceeded')
      return result
    }

    if (!nestedFields || typeof nestedFields !== 'object') return result

    // First, collect all field IDs and their values, prioritizing numeric keys (which contain updated values)
    const fieldValues = {}

    // Process numeric keys first (these contain the updated values)
    Object.keys(nestedFields).forEach(key => {
      const value = nestedFields[key]

      // Process numeric keys (0, 1, 2, etc.) - these contain the updated values
      if (!isNaN(key) && key !== 'value') {
        // This is a numeric key, process its contents directly
        if (typeof value === 'object' && value !== null) {
          // Recursively process the content of numeric keys with increased depth
          // The value here contains field IDs as keys
          const nestedResult = transformNestedValues(value, parentValue, fieldDefinition, depth + 1)
          // Merge the nested result into fieldValues - this should extract all field IDs from the nested structure
          Object.assign(fieldValues, nestedResult)
        } else if (value !== undefined && value !== null) {
          // Numeric key with a simple value - this shouldn't normally happen but handle it
          console.warn(`Numeric key ${key} has non-object value:`, value)
        }
        return
      }

      // If it's a non-numeric key (field ID), process it in the second loop below
      // But first check if it's a simple value (like a string)
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        // This might be a direct field value, process it in the second loop
        return
      }

      // Check if this is a field ID key with nested structure - extract it here if it has value or nestedFields
      if (typeof key === 'string' && !key.startsWith('field-') && (value.value !== undefined || value.nestedFields)) {
        // This is likely a field ID (UUID) with a value/nestedFields structure
        // We'll process it in the second loop, but we need to make sure we don't skip it
        return
      }
    })

    // Then process non-numeric keys (these contain the old values)
    Object.keys(nestedFields).forEach(key => {
      const value = nestedFields[key]

      // Skip numeric keys (already processed above)
      if (!isNaN(key) && key !== 'value') {
        return
      }

      // Use the key as-is (field ID) - but strip "field-" prefix if present
      let fieldId = key
      if (typeof fieldId === 'string' && fieldId.startsWith('field-')) {
        fieldId = fieldId.replace('field-', '')
      }

      // Only process if we haven't already processed this field ID from numeric keys
      if (fieldValues[fieldId]) {
        return
      }

      // Skip processing if this field has an empty/invalid value
      if (isEmptyValue(value)) {
        return
      }

      // Check if this is a direct base64 file string (direct file data)
      if (typeof value === 'string' && value.startsWith('data:')) {
        // This is a direct base64 file string - convert to the same format as non-nested file fields
        fieldValues[fieldId] = { value: value }
        return
      }

      // Process the value and store it
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Check if this is a file field with base64 data (from nested field structure)
        if (value.base64 && typeof value.base64 === 'string' && value.base64.startsWith('data:')) {
          // This is a file field - preserve the original file structure
          fieldValues[fieldId] = {
            value: value.base64,
            name: value.name || 'uploaded_file',
            type: value.type || 'application/octet-stream',
            size: value.size || 0,
            lastModified: value.lastModified || Date.now()
          }
          return
        }

        // Check if this is a phone field (has countryCode and number properties)
        if (value.countryCode !== undefined && value.number !== undefined) {
          // This is a phone field - send the phone object directly without wrapping
          fieldValues[fieldId] = value
          return
        }

        // Check if this is a location field (has country, state, city properties)
        if (value.country !== undefined || value.state !== undefined || value.city !== undefined) {
          // This is a location field - send the location object directly without wrapping
          fieldValues[fieldId] = value
          return
        }

        // Handle nested object structure
        if (value.value !== undefined) {
          // Handle checkbox fields with multiple selections
          let processedValueValue = value.value
          if (Array.isArray(processedValueValue) && processedValueValue.length > 1) {
            // Multiple checkbox selections - create array of objects with nested values
            processedValueValue = processedValueValue.map(optionValue => {
              const checkboxItem = { value: optionValue }

              // Find nested fields for this specific option
              if (value.nestedFields && Object.keys(value.nestedFields).length > 0) {
                // Look for nested fields that match this option value
                const optionNestedFields = value.nestedFields[optionValue] ||
                  value.nestedFields[processedValueValue.indexOf(optionValue)]

                if (optionNestedFields) {
                  const processedNested = transformNestedValues(optionNestedFields, optionValue, fieldDefinition, depth + 1)
                  if (Object.keys(processedNested).length > 0) {
                    // Filter out empty nested values
                    const filteredNested = Object.fromEntries(
                      Object.entries(processedNested).filter(([key, value]) => !isEmptyValue(value?.value))
                    )
                    if (Object.keys(filteredNested).length > 0) {
                      checkboxItem.nestedValues = filteredNested
                    }
                  }
                }
              }

              return checkboxItem
            })
          } else if (Array.isArray(processedValueValue) && processedValueValue.length === 1) {
            processedValueValue = processedValueValue[0]
          }

          // Handle checkbox fields with multiple selections differently
          if (Array.isArray(value.value) && value.value.length > 1) {
            // For multiple checkbox selections, store directly as array
            fieldValues[fieldId] = processedValueValue
          } else {
            // For single values, wrap in object structure
            const processedValue = {
              value: processedValueValue
            }

            // Add nested values if they exist
            if (value.nestedFields && Object.keys(value.nestedFields).length > 0) {
              const processedNested = transformNestedValues(value.nestedFields, processedValueValue, fieldDefinition, depth + 1)
              if (Object.keys(processedNested).length > 0) {
                // Filter out empty nested values
                const filteredNested = Object.fromEntries(
                  Object.entries(processedNested).filter(([key, nestedValue]) => {
                    // Check for various types of values that should be considered non-empty
                    if (nestedValue === null || nestedValue === undefined) return false
                    if (typeof nestedValue === 'object') {
                      // For phone fields
                      if (nestedValue.countryCode && nestedValue.number) return true
                      // For location fields
                      if (nestedValue.country || nestedValue.state || nestedValue.city) return true
                      // For regular fields with value property
                      if (nestedValue.value !== undefined && nestedValue.value !== null && nestedValue.value !== '') return true
                      // For nested object structures
                      if (Object.keys(nestedValue).length > 0) return true
                    }
                    if (typeof nestedValue === 'string' && nestedValue.trim() !== '') return true
                    if (Array.isArray(nestedValue) && nestedValue.length > 0) return true
                    return false
                  })
                )
                if (Object.keys(filteredNested).length > 0) {
                  processedValue.nestedValues = filteredNested
                }
              }
            }

            fieldValues[fieldId] = processedValue
          }
        } else {
          // Direct nested object - process recursively with increased depth
          const processedNested = transformNestedValues(value, parentValue, fieldDefinition, depth + 1)
          if (Object.keys(processedNested).length > 0) {
            // Check if the processed nested result has meaningful content
            const hasContent = Object.values(processedNested).some(val => {
              if (val === null || val === undefined) return false
              if (typeof val === 'object') {
                // For phone fields
                if (val.countryCode && val.number) return true
                // For location fields
                if (val.country || val.state || val.city) return true
                // For regular fields with value property
                if (val.value !== undefined && val.value !== null && val.value !== '') return true
                // For nested structures
                if (Object.keys(val).length > 0) return true
              }
              if (typeof val === 'string' && val.trim() !== '') return true
              if (Array.isArray(val) && val.length > 0) return true
              return false
            })

            if (hasContent) {
              fieldValues[fieldId] = processedNested
            }
          }
        }
      } else if (Array.isArray(value)) {
        // Handle array of nested values (like multiple checkboxes)
        const processedArray = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            // Check if this is a file field with base64 data
            if (item.base64 && typeof item.base64 === 'string' && item.base64.startsWith('data:')) {
              // This is a file field - preserve the original file structure
              return {
                value: item.base64,
                name: item.name || 'uploaded_file',
                type: item.type || 'application/octet-stream',
                size: item.size || 0,
                lastModified: item.lastModified || Date.now()
              }
            }

            // Ensure value is not wrapped in array
            let processedValue = item.value
            if (Array.isArray(processedValue) && processedValue.length === 1) {
              processedValue = processedValue[0]
            }

            const processedItem = {
              value: processedValue,
              ...(item.nestedFields && Object.keys(item.nestedFields).length > 0 && {
                nestedValues: transformNestedValues(item.nestedFields, processedValue, fieldDefinition, depth + 1)
              })
            }
            // Remove empty nestedValues
            if (processedItem.nestedValues && Object.keys(processedItem.nestedValues).length === 0) {
              delete processedItem.nestedValues
            }
            return processedItem
          }
          // Handle simple values that might be arrays
          let processedValue = item
          if (Array.isArray(processedValue) && processedValue.length === 1) {
            processedValue = processedValue[0]
          }
          return { value: processedValue }
        }).filter(item => item.value !== undefined && item.value !== null)

        if (processedArray.length > 0) {
          // Only use array if we have multiple items, otherwise use the single value
          if (processedArray.length === 1) {
            // For single values, extract the value directly and ensure it's not wrapped in array
            const singleItem = processedArray[0]
            if (Array.isArray(singleItem.value) && singleItem.value.length === 1) {
              // If the value itself is an array with one item, extract that item
              fieldValues[fieldId] = { value: singleItem.value[0] }
            } else {
              fieldValues[fieldId] = singleItem
            }
          } else {
            fieldValues[fieldId] = processedArray
          }
        }
      } else if (value !== undefined && value !== null) {
        // Handle simple values (strings, numbers, etc.) - this is for direct field values
        // This can happen when a field has a simple value stored directly (not wrapped in an object)
        if (Array.isArray(value)) {
          if (value.length === 1) {
            // Single item array - extract the item
            fieldValues[fieldId] = { value: value[0] }
          } else {
            // Multiple values - keep as array
            fieldValues[fieldId] = { value }
          }
        } else {
          // Simple value (string, number, etc.)
          fieldValues[fieldId] = { value }
        }
      }
    })

    // Now copy all field values to the result
    Object.assign(result, fieldValues)

    return result
  }

  Object.keys(formValues).forEach(fieldId => {
    const fieldValue = formValues[fieldId]
    let field = fields.find(f => f.id === fieldId)

    // If not found by exact match, try with "field-" prefix added
    if (!field && !fieldId.startsWith('field-')) {
      field = fields.find(f => f.id === `field-${fieldId}`)
    }

    // If still not found, try with "field-" prefix removed
    if (!field && fieldId.startsWith('field-')) {
      const cleanFieldId = fieldId.replace('field-', '')
      field = fields.find(f => f.id === cleanFieldId)
    }

    if (!field) return

    // Skip empty values for non-required fields
    if (!field.required && !field.validation?.required) {
      let isEmpty = false

      if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
        isEmpty = true
      } else if (Array.isArray(fieldValue) && fieldValue.length === 0) {
        isEmpty = true
      } else if (typeof fieldValue === 'object' && fieldValue !== null) {
        if (field.type === 'location') {
          isEmpty = (!fieldValue.country || fieldValue.country === '') &&
            (!fieldValue.state || fieldValue.state === '') &&
            (!fieldValue.city || fieldValue.city === '')
        } else if (field.type === 'phone') {
          isEmpty = (!fieldValue.country || fieldValue.country === '') &&
            (!fieldValue.number || fieldValue.number === '')
        } else if (field.type === 'file') {
          isEmpty = !fieldValue.name && !fieldValue.base64
        } else if (fieldValue.value !== undefined) {
          // For nested fields, check if the value is empty
          if (Array.isArray(fieldValue.value)) {
            isEmpty = fieldValue.value.length === 0
          } else {
            isEmpty = !fieldValue.value || fieldValue.value === ''
          }
        } else {
          isEmpty = Object.keys(fieldValue).length === 0
        }
      }

      if (isEmpty) {
        return
      }
    }

    // Use the ORIGINAL field ID from the form data, but ensure it's a valid UUID
    // If originalId is not a valid UUID (old format), use the parsed field.id instead
    let finalFieldKey = fieldId

    // Priority: originalId (if valid UUID) > field.id (if valid UUID) > fieldId (if valid UUID) > generate new UUID
    if (field.originalId && isValidUUID(field.originalId)) {
      finalFieldKey = field.originalId
    } else if (field.id && isValidUUID(field.id)) {
      finalFieldKey = field.id
    } else if (isValidUUID(fieldId)) {
      finalFieldKey = fieldId
    } else {
      // If nothing is valid, generate a new UUID (shouldn't happen but safe fallback)
      console.warn(`Invalid field ID format for field ${field.name || field.label}, generating new UUID`)
      finalFieldKey = uuidv4()
    }

    // If field ID has "field-" prefix, strip it to get just the UUID
    if (typeof finalFieldKey === 'string' && finalFieldKey.startsWith('field-')) {
      finalFieldKey = finalFieldKey.replace('field-', '')
    }

    // Final validation: ensure we have a valid UUID
    if (!isValidUUID(finalFieldKey)) {
      // Last resort: use field.id if it's valid, otherwise generate new UUID
      if (field.id && isValidUUID(field.id)) {
        finalFieldKey = field.id
      } else {
        console.warn(`Failed to get valid UUID for field ${field.name || field.label}, generating new UUID`)
        finalFieldKey = uuidv4()
      }
    }

    // Handle different field types
    switch (field.type) {
      case "select":
        if (field.validation?.multiple) {
          // Multiple select: normalize to array of { value, nestedValues? }
          const buildItemsFromValues = (valuesArr, nested) => {
            if (!Array.isArray(valuesArr)) return []
            return valuesArr
              .filter(v => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
              .map((v, idx) => {
                // Extract primitive value from possible wrappers
                const primitiveValue = Array.isArray(v) ? (v.length === 1 ? v[0] : v) : (typeof v === 'object' && v !== null && v.value !== undefined ? v.value : v)
                const item = { value: primitiveValue }

                // Attach nested values per option, if present
                if (nested && Object.keys(nested).length > 0) {
                  // Use processed options if available, otherwise fall back to regular options
                  const optionsToSearch = field._processedOptions || field.options || []

                  // Try to find nested fields by option index first, then by option value
                  let optionNested = nested[idx]
                  if (!optionNested) {
                    // Find option index in field options
                    const optionIndex = optionsToSearch.findIndex(opt => {
                      const optValue = typeof opt === 'string' ? opt : (opt?.value || opt?.label)
                      return optValue === primitiveValue
                    })
                    if (optionIndex !== -1) {
                      optionNested = nested[optionIndex]
                    }
                  }
                  if (!optionNested) {
                    optionNested = nested[primitiveValue]
                  }

                  if (optionNested) {
                    const processed = transformNestedValues(optionNested, primitiveValue, field, 0)
                    if (processed && Object.keys(processed).length > 0) {
                      // Filter out empty nested values
                      const filteredNested = Object.fromEntries(
                        Object.entries(processed).filter(([key, value]) => !isEmptyValue(value?.value))
                      )
                      if (Object.keys(filteredNested).length > 0) {
                        item.nestedValues = filteredNested
                      }
                    }
                  }
                }
                return item
              })
          }

          let items = []
          // Normalize various incoming shapes
          if (Array.isArray(fieldValue)) {
            // Could be ["A","B"] or [{value:"A"},{value:"B"}]
            items = buildItemsFromValues(fieldValue, undefined)
          } else if (typeof fieldValue === 'object' && fieldValue !== null) {
            if (Array.isArray(fieldValue.value)) {
              items = buildItemsFromValues(fieldValue.value, fieldValue.nestedFields)
            } else if (Array.isArray(fieldValue)) {
              items = buildItemsFromValues(fieldValue, fieldValue.nestedFields)
            } else if (fieldValue.value !== undefined) {
              // Single selection provided for a multi-select
              items = buildItemsFromValues([fieldValue.value], fieldValue.nestedFields)
            }
          }

          // Final fallback
          if (!Array.isArray(items) || items.length === 0) {
            items = []
          }

          transformedValues[finalFieldKey] = items
        } else {
          // Single select
          if (typeof fieldValue === 'object' && fieldValue !== null) {
            if (fieldValue.value !== undefined || fieldValue.nestedFields) {
              // Ensure value is not wrapped in array for single selections
              let processedValue = fieldValue.value || ""
              if (Array.isArray(processedValue) && processedValue.length === 1) {
                processedValue = processedValue[0]
              }

              const fieldData = {
                value: processedValue
              }

              // Only include nested fields if they exist and are relevant to the selected option
              if (fieldValue.nestedFields && Object.keys(fieldValue.nestedFields).length > 0) {
                // Use processed options if available, otherwise fall back to regular options
                const optionsToSearch = field._processedOptions || field.options || []

                // Find the option index for the selected value
                const selectedOptionIndex = optionsToSearch.findIndex(opt => {
                  const optValue = typeof opt === 'string' ? opt : (opt?.value || opt?.label)
                  return optValue === processedValue
                })

                // Get nested fields for the selected option index
                let optionNestedFields = null
                if (selectedOptionIndex !== -1 && fieldValue.nestedFields[selectedOptionIndex]) {
                  optionNestedFields = fieldValue.nestedFields[selectedOptionIndex]
                } else {
                  // Fallback: try to get by numeric keys or process all
                  optionNestedFields = fieldValue.nestedFields
                }

                if (optionNestedFields) {
                  const processedNested = transformNestedValues(optionNestedFields, processedValue, field, 0)
                  if (Object.keys(processedNested).length > 0) {
                    // Filter out empty nested values - handle arrays and objects properly
                    const filteredNested = Object.fromEntries(
                      Object.entries(processedNested).filter(([key, value]) => {
                        // For arrays, check if array has items
                        if (Array.isArray(value)) {
                          return value.length > 0
                        }
                        // For objects, check various value structures
                        if (typeof value === 'object' && value !== null) {
                          // Check for phone fields
                          if (value.countryCode && value.number) return true
                          // Check for location fields
                          if (value.country || value.state || value.city) return true
                          // Check for value property
                          if (value.value !== undefined && value.value !== null && value.value !== '') return true
                          // Check for nestedValues
                          if (value.nestedValues && Object.keys(value.nestedValues).length > 0) return true
                          // Check if object has any meaningful keys
                          if (Object.keys(value).length > 0) return true
                          return false
                        }
                        // For strings and other primitives, use isEmptyValue
                        return !isEmptyValue(value?.value !== undefined ? value.value : value)
                      })
                    )
                    if (Object.keys(filteredNested).length > 0) {
                      fieldData.nestedValues = filteredNested
                    }
                  }
                }
              }

              transformedValues[finalFieldKey] = fieldData
            } else {
              // Fallback for simple values
              let processedValue = fieldValue
              if (Array.isArray(processedValue) && processedValue.length === 1) {
                processedValue = processedValue[0]
              }
              transformedValues[finalFieldKey] = { value: processedValue }
            }
          } else {
            // Handle direct values that might be arrays
            let processedValue = fieldValue || ""
            if (Array.isArray(processedValue) && processedValue.length === 1) {
              processedValue = processedValue[0]
            }
            transformedValues[finalFieldKey] = { value: processedValue }
          }
        }
        break

      case "checkbox":
        // Handle checkbox fields with multiple selections
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          if (fieldValue.value !== undefined || fieldValue.nestedFields) {
            let processedValue = fieldValue.value

            // For checkboxes, handle multiple selections properly
            if (Array.isArray(processedValue)) {
              // Multiple checkbox selections - create array of objects
              const checkboxArray = processedValue.map((optionValue, arrayIndex) => {
                const checkboxItem = { value: optionValue }

                // Find nested fields for this specific option
                if (fieldValue.nestedFields && Object.keys(fieldValue.nestedFields).length > 0) {
                  // Use processed options if available, otherwise fall back to regular options
                  const optionsToSearch = field._processedOptions || field.options || []

                  // Try to find nested fields by option index first
                  let optionNestedFields = fieldValue.nestedFields[arrayIndex]

                  if (!optionNestedFields) {
                    // Find option index in field options
                    const optionIndex = optionsToSearch.findIndex(opt => {
                      const optValue = typeof opt === 'string' ? opt : (opt?.value || opt?.label)
                      return optValue === optionValue
                    })
                    if (optionIndex !== -1) {
                      optionNestedFields = fieldValue.nestedFields[optionIndex]
                    }
                  }

                  if (!optionNestedFields) {
                    // Fallback: try by option value or by index in array
                    optionNestedFields = fieldValue.nestedFields[optionValue] ||
                      fieldValue.nestedFields[processedValue.indexOf(optionValue)]
                  }

                  if (optionNestedFields) {
                    const processedNested = transformNestedValues(optionNestedFields, optionValue, field, 0)
                    if (Object.keys(processedNested).length > 0) {
                      // Filter out empty nested values - handle arrays and objects properly
                      const filteredNested = Object.fromEntries(
                        Object.entries(processedNested).filter(([key, value]) => {
                          // For arrays, check if array has items
                          if (Array.isArray(value)) {
                            return value.length > 0
                          }
                          // For objects, check various value structures
                          if (typeof value === 'object' && value !== null) {
                            // Check for phone fields
                            if (value.countryCode && value.number) return true
                            // Check for location fields
                            if (value.country || value.state || value.city) return true
                            // Check for value property
                            if (value.value !== undefined && value.value !== null && value.value !== '') return true
                            // Check for nestedValues
                            if (value.nestedValues && Object.keys(value.nestedValues).length > 0) return true
                            // Check if object has any meaningful keys
                            if (Object.keys(value).length > 0) return true
                            return false
                          }
                          // For strings and other primitives, use isEmptyValue
                          return !isEmptyValue(value?.value !== undefined ? value.value : value)
                        })
                      )
                      if (Object.keys(filteredNested).length > 0) {
                        checkboxItem.nestedValues = filteredNested
                      }
                    }
                  }
                }

                return checkboxItem
              })

              // For checkbox fields, send the array directly without wrapping in a value property
              transformedValues[finalFieldKey] = checkboxArray
            } else {
              // Single checkbox selection
              const fieldData = { value: processedValue }

              if (fieldValue.nestedFields && Object.keys(fieldValue.nestedFields).length > 0) {
                // Use processed options if available, otherwise fall back to regular options
                const optionsToSearch = field._processedOptions || field.options || []

                // Find the option index for the selected value
                const selectedOptionIndex = optionsToSearch.findIndex(opt => {
                  const optValue = typeof opt === 'string' ? opt : (opt?.value || opt?.label)
                  return optValue === processedValue
                })

                // Get nested fields for the selected option index
                let optionNestedFields = null
                if (selectedOptionIndex !== -1 && fieldValue.nestedFields[selectedOptionIndex]) {
                  optionNestedFields = fieldValue.nestedFields[selectedOptionIndex]
                } else {
                  // Fallback: try to get by numeric keys or process all
                  optionNestedFields = fieldValue.nestedFields
                }

                if (optionNestedFields) {
                  const processedNested = transformNestedValues(optionNestedFields, processedValue, field, 0)
                  if (Object.keys(processedNested).length > 0) {
                    // Filter out empty nested values
                    const filteredNested = Object.fromEntries(
                      Object.entries(processedNested).filter(([key, value]) => !isEmptyValue(value?.value))
                    )
                    if (Object.keys(filteredNested).length > 0) {
                      fieldData.nestedValues = filteredNested
                    }
                  }
                }
              }

              transformedValues[finalFieldKey] = fieldData
            }
          } else {
            // Fallback for simple values
            let processedValue = fieldValue
            if (Array.isArray(processedValue) && processedValue.length === 1) {
              processedValue = processedValue[0]
            }
            transformedValues[finalFieldKey] = { value: processedValue }
          }
        } else {
          // Handle direct values that might be arrays
          let processedValue = fieldValue
          if (Array.isArray(processedValue) && processedValue.length === 1) {
            processedValue = processedValue[0]
          }
          transformedValues[finalFieldKey] = { value: processedValue }
        }
        break

      case "radio":
        // Handle radio fields with single selection
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          if (fieldValue.value !== undefined || fieldValue.nestedFields) {
            // Ensure value is not wrapped in array for single selections
            let processedValue = fieldValue.value
            if (Array.isArray(processedValue) && processedValue.length === 1) {
              processedValue = processedValue[0]
            }

            const fieldData = {
              value: processedValue
            }

            // Add nested values if they exist
            if (fieldValue.nestedFields && Object.keys(fieldValue.nestedFields).length > 0) {
              // Use processed options if available, otherwise fall back to regular options
              const optionsToSearch = field._processedOptions || field.options || []

              // Find the option index for the selected value
              const selectedOptionIndex = optionsToSearch.findIndex(opt => {
                const optValue = typeof opt === 'string' ? opt : (opt?.value || opt?.label)
                return optValue === processedValue
              })

              // Get nested fields for the selected option index
              let optionNestedFields = null
              if (selectedOptionIndex !== -1 && fieldValue.nestedFields[selectedOptionIndex]) {
                optionNestedFields = fieldValue.nestedFields[selectedOptionIndex]
              } else {
                // Fallback: try to get by numeric keys or process all
                optionNestedFields = fieldValue.nestedFields
              }

              if (optionNestedFields) {
                const processedNested = transformNestedValues(optionNestedFields, processedValue, field, 0)
                if (Object.keys(processedNested).length > 0) {
                  // Filter out empty nested values - handle arrays and objects properly
                  const filteredNested = Object.fromEntries(
                    Object.entries(processedNested).filter(([key, value]) => {
                      // For arrays, check if array has items
                      if (Array.isArray(value)) {
                        return value.length > 0
                      }
                      // For objects, check various value structures
                      if (typeof value === 'object' && value !== null) {
                        // Check for phone fields
                        if (value.countryCode && value.number) return true
                        // Check for location fields
                        if (value.country || value.state || value.city) return true
                        // Check for value property
                        if (value.value !== undefined && value.value !== null && value.value !== '') return true
                        // Check for nestedValues
                        if (value.nestedValues && Object.keys(value.nestedValues).length > 0) return true
                        // Check if object has any meaningful keys
                        if (Object.keys(value).length > 0) return true
                        return false
                      }
                      // For strings and other primitives, use isEmptyValue
                      return !isEmptyValue(value?.value !== undefined ? value.value : value)
                    })
                  )
                  if (Object.keys(filteredNested).length > 0) {
                    fieldData.nestedValues = filteredNested
                  }
                }
              }
            }

            transformedValues[finalFieldKey] = fieldData
          } else {
            // Fallback for simple values
            let processedValue = fieldValue
            if (Array.isArray(processedValue) && processedValue.length === 1) {
              processedValue = processedValue[0]
            }
            transformedValues[finalFieldKey] = { value: processedValue }
          }
        } else {
          // Handle direct values that might be arrays
          let processedValue = fieldValue
          if (Array.isArray(processedValue) && processedValue.length === 1) {
            processedValue = processedValue[0]
          }
          transformedValues[finalFieldKey] = { value: processedValue }
        }
        break

      case "file":
        if (fieldValue && typeof fieldValue === 'object' && fieldValue.base64) {
          transformedValues[finalFieldKey] = { value: fieldValue.base64 }
        } else if (fieldValue && typeof fieldValue === 'string' && fieldValue.startsWith('data:')) {
          transformedValues[finalFieldKey] = { value: fieldValue }
        } else {
          transformedValues[finalFieldKey] = { value: "" }
        }
        break

      // case "location":
      //   if (typeof fieldValue === 'object' && fieldValue !== null) {
      //     const locationData = {
      //       value: "location",
      //       nestedValues: {
      //         country: { value: fieldValue.country || "" },
      //         state: { value: fieldValue.state || "" },
      //         city: { value: fieldValue.city || "" }
      //       }
      //     }
      //     transformedValues[finalFieldKey] = locationData
      //   } else {
      //     transformedValues[finalFieldKey] = { value: "" }
      //   }
      //   break

      case "location":
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          // Create location object in the direct format expected by API
          const locationData = {
            country: fieldValue.country || "",
            state: fieldValue.state || "",
            city: fieldValue.city || ""
          }
          transformedValues[finalFieldKey] = locationData

          console.log('📍 Location field transformed:', {
            fieldId: finalFieldKey,
            transformed: transformedValues[finalFieldKey]
          })
        } else {
          transformedValues[finalFieldKey] = {
            country: "",
            state: "",
            city: ""
          }
        }
        break

      // case "phone":
      //   if (typeof fieldValue === 'object' && fieldValue !== null) {
      //     const phoneData = {
      //       value: "phone",
      //       nestedValues: {
      //         country: { value: fieldValue.country || "" },
      //         number: { value: fieldValue.number || "" }
      //       }
      //     }
      //     transformedValues[finalFieldKey] = phoneData
      //   } else {
      //     transformedValues[finalFieldKey] = { value: "" }
      //   }
      //   break
      case "phone":
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          // Find the country code from phoneCountries with proper fallback
          let countryCode = "+1" // Default fallback
          let number = fieldValue.number || ""

          if (phoneCountries && Array.isArray(phoneCountries)) {
            const phoneCountry = phoneCountries.find(c => c.code === fieldValue.country)
            countryCode = phoneCountry?.dial || "+1"
          } else {
            console.warn('phoneCountries not available, using default country code +1')
          }

          // Create the phone object in the exact format expected by API
          const phoneData = {
            countryCode: countryCode,
            number: number
          }

          // Set the phone data directly (no contact_number wrapper)
          transformedValues[finalFieldKey] = phoneData

          console.log('📞 Phone field transformed:', {
            fieldId: finalFieldKey,
            transformed: transformedValues[finalFieldKey]
          })
        } else {
          transformedValues[finalFieldKey] = {
            countryCode: "+1",
            number: ""
          }
        }
        break

      case "group":
        // For group fields, extract subfield values to top level instead of nesting
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          // The fieldValue contains subfield IDs as keys with their values
          Object.keys(fieldValue).forEach(subFieldId => {
            const subFieldValue = fieldValue[subFieldId]
            const subField = field.subFields?.find(sf => sf.id === subFieldId)

            // Transform each subfield value based on its type
            if (subField) {
              switch (subField.type) {
                case "phone":
                  if (typeof subFieldValue === 'object' && subFieldValue !== null) {
                    let countryCode = "+1"
                    let number = subFieldValue.number || ""
                    if (phoneCountries && Array.isArray(phoneCountries)) {
                      const phoneCountry = phoneCountries.find(c => c.code === subFieldValue.country)
                      countryCode = phoneCountry?.dial || "+1"
                    }
                    transformedValues[subFieldId] = { countryCode, number }
                  } else {
                    transformedValues[subFieldId] = { countryCode: "+1", number: "" }
                  }
                  break
                case "location":
                  if (typeof subFieldValue === 'object' && subFieldValue !== null) {
                    transformedValues[subFieldId] = {
                      country: subFieldValue.country || "",
                      state: subFieldValue.state || "",
                      city: subFieldValue.city || ""
                    }
                  } else {
                    transformedValues[subFieldId] = { country: "", state: "", city: "" }
                  }
                  break
                case "select":
                case "checkbox":
                case "radio":
                  if (typeof subFieldValue === 'object' && subFieldValue !== null && subFieldValue.value !== undefined) {
                    transformedValues[subFieldId] = { value: subFieldValue.value }
                  } else {
                    transformedValues[subFieldId] = { value: subFieldValue || "" }
                  }
                  break
                default:
                  // For text, email, number, textarea, etc.
                  transformedValues[subFieldId] = { value: subFieldValue || "" }
              }
            } else {
              // Fallback if subField definition not found
              transformedValues[subFieldId] = { value: subFieldValue || "" }
            }
          })
        }
        // Don't add the group itself to transformedValues - only its subfields
        break

      default:
        // Text, email, number, textarea
        transformedValues[finalFieldKey] = { value: fieldValue || "" }
    }
  })

  return transformedValues
}

// Transform submission values for form display
const transformSubmissionValues = (submissionValues, fields, phoneCountries = []) => {
  const transformedValues = {}

  if (!submissionValues || typeof submissionValues !== 'object') {
    console.log('No submission values to transform')
    return transformedValues
  }

  // Helper function to recursively transform API nestedValues to nestedFields structure
  const transformApiNestedValuesToNestedFields = (nestedValues, depth = 0) => {
    // Prevent infinite recursion
    if (depth > 10) {
      console.warn('Maximum nested field depth exceeded in API transformation')
      return {}
    }

    if (!nestedValues || typeof nestedValues !== 'object') return {}

    const result = {}

    Object.keys(nestedValues).forEach(key => {
      const value = nestedValues[key]

      if (Array.isArray(value)) {
        // Handle checkbox arrays - convert to form's expected structure
        const checkboxValues = []
        const checkboxNestedFields = {}

        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null && item.value !== undefined) {
            // Check if this is a file field with base64 data
            if (typeof item.value === 'string' && item.value.startsWith('data:')) {
              // This is a file field - create a file object from base64 with original metadata
              // Extract original metadata from nested structure
              const originalName = item.name?.value || item.name || `nested_file_${key}_${index}`
              const originalType = item.type?.value || item.type
              const originalSize = item.size?.value || item.size
              const originalLastModified = item.lastModified?.value || item.lastModified

              const fileObject = createFileFromBase64(
                item.value,
                originalName,
                originalType,
                originalSize,
                originalLastModified
              )
              if (fileObject) {
                checkboxValues.push(fileObject)
              } else {
                checkboxValues.push(item.value)
              }
            } else {
              checkboxValues.push(item.value)
            }

            // Convert nestedValues to nestedFields for this option
            if (item.nestedValues && Object.keys(item.nestedValues).length > 0) {
              checkboxNestedFields[index] = transformApiNestedValuesToNestedFields(item.nestedValues, depth + 1)
            }
          }
        })

        // Return the form's expected structure
        result[key] = {
          value: checkboxValues,
          nestedFields: checkboxNestedFields
        }
      } else if (typeof value === 'object' && value !== null) {
        if (value.value !== undefined) {
          // Check if this is a file field with base64 data
          if (typeof value.value === 'string' && value.value.startsWith('data:')) {
            // This is a file field - create a file object from base64 with original metadata
            // Extract original metadata from nested structure
            const originalName = value.name?.value || value.name || `nested_file_${key}`
            const originalType = value.type?.value || value.type
            const originalSize = value.size?.value || value.size
            const originalLastModified = value.lastModified?.value || value.lastModified

            const fileObject = createFileFromBase64(
              value.value,
              originalName,
              originalType,
              originalSize,
              originalLastModified
            )
            if (fileObject) {
              result[key] = fileObject
            } else {
              result[key] = value.value
            }
          } else {
            // For nested fields, maintain the proper structure for select/radio/checkbox fields
            const fieldValue = {
              value: value.value,
              nestedFields: {}
            }

            // If there are nested values, process them recursively
            if (value.nestedValues && Object.keys(value.nestedValues).length > 0) {
              const nestedResult = transformApiNestedValuesToNestedFields(value.nestedValues, depth + 1)
              fieldValue.nestedFields = nestedResult
            }

            result[key] = fieldValue
          }
        } else {
          // Check if this is a phone field (has countryCode and number properties)
          if (value.countryCode !== undefined && value.number !== undefined) {
            // This is a phone field - store it directly without recursive processing
            result[key] = value
          } else if (value.country !== undefined || value.state !== undefined || value.city !== undefined) {
            // This is a location field - store it directly without recursive processing
            result[key] = value
          } else {
            // Direct nested object - process recursively
            const nestedResult = transformApiNestedValuesToNestedFields(value, depth + 1)
            Object.assign(result, nestedResult)
          }
        }
      } else {
        // Simple value - check if it's a base64 file string
        if (typeof value === 'string' && value.startsWith('data:')) {
          // This is a direct base64 file string - create a file object
          const fileObject = createFileFromBase64(value, `nested_file_${key}`)
          if (fileObject) {
            result[key] = fileObject
          } else {
            result[key] = value
          }
        } else {
          result[key] = value
        }
      }
    })

    return result
  }

  // Helper function to process the main field values
  const processFieldValue = (fieldId, fieldValue, field) => {

    // Handle empty strings
    if (fieldValue === "" || fieldValue === null || fieldValue === undefined) {
      // Return appropriate default based on field type
      if (field.type === "checkbox" || (field.type === "select" && field.validation?.multiple)) {
        return { value: [], nestedFields: {} }
      } else if (field.type === "file") {
        return null
      } else if (field.type === "location" || field.type === "phone") {
        return {}
      } else {
        return ""
      }
    }

    // Handle JSON strings from API
    let parsedValue = fieldValue
    if (typeof fieldValue === 'string') {
      try {
        parsedValue = JSON.parse(fieldValue)
      } catch (e) {
        // If JSON parsing fails, treat as simple string value
        // Special handling for file fields - convert base64 strings to file objects
        if (field.type === 'file' && fieldValue.startsWith('data:')) {
          console.log('📁 Processing file field with base64 data (simple string):', fieldId)

          // Create a file object from base64 string
          const fileObject = createFileFromBase64(fieldValue, field.label || field.name || 'uploaded_file')
          if (fileObject) {
            return fileObject
          } else {
            console.log('❌ Failed to create file object from base64')
            return null
          }
        }

        return fieldValue
      }
    }

    // Handle different field types
    if (typeof parsedValue === 'object' && parsedValue !== null) {
      // Special handling for checkbox fields - check if this is an array (checkbox selections)
      if (field.type === 'checkbox' && Array.isArray(parsedValue)) {
        console.log('☑️ Processing checkbox field array:', parsedValue)

        // Extract values and nested fields from checkbox array
        const checkboxValues = []
        const checkboxNestedFields = {}

        parsedValue.forEach((item, index) => {
          if (typeof item === 'object' && item !== null && item.value !== undefined) {
            checkboxValues.push(item.value)

            // Convert nestedValues to nestedFields for this option
            if (item.nestedValues && Object.keys(item.nestedValues).length > 0) {
              // Find the correct index in field options based on the option value
              const optionIndex = field.options?.findIndex(option => {
                const optionValue = typeof option === 'string' ? option : option.value
                return optionValue === item.value
              })

              if (optionIndex !== -1) {
                checkboxNestedFields[optionIndex] = transformApiNestedValuesToNestedFields(item.nestedValues, 0)
              }
            }
          }
        })

        const result = {
          value: checkboxValues,
          nestedFields: checkboxNestedFields
        }
        console.log('☑️ Checkbox field result:', result)
        return result
      }

      // Special handling for multi-select fields - check if this is an array (multi-select selections)
      if (field.type === 'select' && field.validation?.multiple && Array.isArray(parsedValue)) {
        console.log('🔽 Processing multi-select field array:', parsedValue)

        // Extract values and nested fields from multi-select array
        const selectValues = []
        const selectNestedFields = {}

        parsedValue.forEach((item, index) => {
          if (typeof item === 'object' && item !== null && item.value !== undefined) {
            selectValues.push(item.value)

            // Convert nestedValues to nestedFields for this option
            if (item.nestedValues && Object.keys(item.nestedValues).length > 0) {
              // Find the correct index in field options based on the option value
              const optionIndex = field.options?.findIndex(option => {
                const optionValue = typeof option === 'string' ? option : option.value
                return optionValue === item.value
              })

              if (optionIndex !== -1) {
                selectNestedFields[optionIndex] = transformApiNestedValuesToNestedFields(item.nestedValues, 0)
              }
            }
          }
        })

        const result = {
          value: selectValues,
          nestedFields: selectNestedFields
        }
        console.log('🔽 Multi-select field result:', result)
        return result
      }

      // Special handling for phone fields
      if (field.type === 'phone' && parsedValue.countryCode !== undefined) {
        console.log(' Processing phone field:', parsedValue)
        console.log(' Available phone countries:', phoneCountries?.length || 0)

        // Convert API phone format to form format
        // Need to find the country code from phoneCountries by matching the dial code
        let countryCode = ''
        if (phoneCountries && Array.isArray(phoneCountries)) {
          const phoneCountry = phoneCountries.find(c => c.dial === parsedValue.countryCode)
          console.log(' Found phone country:', phoneCountry)
          countryCode = phoneCountry?.code || ''
        } else {
          console.warn('📞 phoneCountries not available for phone field processing')
        }

        const result = {
          country: countryCode,
          number: parsedValue.number || ''
        }
        console.log('📞 Phone field result:', result)
        return result
      }

      // Special handling for location fields
      if (field.type === 'location' && (parsedValue.country !== undefined || parsedValue.state !== undefined || parsedValue.city !== undefined)) {
        console.log('📍 Processing location field:', parsedValue)
        console.log('📍 Field ID:', fieldId, 'Field type:', field.type)

        // Convert API location format to form format
        // The API stores location as { country: "101", state: "4008", city: "133024" }
        // The form expects the same format, so we can return it as-is
        const result = {
          country: parsedValue.country || '',
          state: parsedValue.state || '',
          city: parsedValue.city || ''
        }
        console.log('📍 Location field result:', result)
        return result
      }

      // Handle fields with value property
      if (parsedValue.value !== undefined) {
        // Special handling for file fields with base64 data in value property
        if (field.type === 'file' && typeof parsedValue.value === 'string' && parsedValue.value.startsWith('data:')) {
          console.log('📁 Processing file field with base64 data in value property:', fieldId)

          // Create a file object from base64 string
          const fileObject = createFileFromBase64(parsedValue.value, field.label || field.name || 'uploaded_file')
          if (fileObject) {
            return fileObject
          } else {
            console.log('❌ Failed to create file object from value property')
            return null
          }
        }

        // For simple text fields with only a value (no nested values), return just the string
        if (!parsedValue.nestedValues || Object.keys(parsedValue.nestedValues).length === 0) {
          // Check if this is a simple field type that expects just a string value
          if (field.type === 'text' || field.type === 'textarea' || field.type === 'email' || field.type === 'number' || field.type === 'datetime') {
            return parsedValue.value
          }
        }

        // For complex fields with nested values, return the full object structure
        const processedValue = {
          value: parsedValue.value
        }

        // Process nested values from API and convert nestedValues to nestedFields
        if (parsedValue.nestedValues) {
          console.log(`🔄 Processing nested values for ${field.type} field ${fieldId}:`, parsedValue.nestedValues)

          // For fields with nested values, we need to organize them by option index
          // First, find the option index for the selected value
          let optionIndex = -1
          if (field.options && Array.isArray(field.options)) {
            optionIndex = field.options.findIndex(opt => {
              const optValue = typeof opt === 'string' ? opt : opt.value
              return optValue === parsedValue.value
            })
          }

          if (optionIndex !== -1) {
            // Create the nested fields structure organized by option index
            processedValue.nestedFields = {
              [optionIndex]: transformApiNestedValuesToNestedFields(parsedValue.nestedValues, 0)
            }
          } else {
            // Fallback to the old structure if we can't find the option index
            processedValue.nestedFields = transformApiNestedValuesToNestedFields(parsedValue.nestedValues, 0)
          }

        }
        return processedValue
      } else {
        // Direct object without value property
        return parsedValue
      }
    } else {
      // Simple value or unparsed string
      // Special handling for file fields - convert base64 strings to file objects
      if (field.type === 'file' && typeof parsedValue === 'string' && parsedValue.startsWith('data:')) {
        console.log('📁 Processing file field with base64 data:', fieldId)

        // Create a file object from base64 string
        const fileObject = createFileFromBase64(parsedValue, field.label || field.name || 'uploaded_file')
        if (fileObject) {
          console.log('✅ Created file object:', fileObject)
          return fileObject
        } else {
          console.log('❌ Failed to create file object from base64')
          return null
        }
      }

      return parsedValue
    }
  }

  fields.forEach(field => {
    const fieldId = field.id
    let fieldValue = submissionValues[fieldId]

    // If not found by parsed form ID, try the clean UUID (without "field-" prefix)
    if (fieldValue === undefined && fieldId.startsWith('field-')) {
      const cleanFieldId = fieldId.replace('field-', '')
      fieldValue = submissionValues[cleanFieldId]
    }

    // If not found by parsed form ID, try the original field ID from API
    if (fieldValue === undefined && field.originalId) {
      fieldValue = submissionValues[field.originalId]
    }

    // If still not found, try to find by field name
    if (fieldValue === undefined && field.name) {
      fieldValue = submissionValues[field.name]
    }

    if (fieldValue !== undefined && fieldValue !== null) {
      const processedValue = processFieldValue(fieldId, fieldValue, field)
      transformedValues[fieldId] = processedValue
    } else {
      // Set appropriate defaults
      const defaultValue = field.type === "checkbox" || (field.type === "select" && field.validation?.multiple)
        ? { value: [], nestedFields: {} }
        : field.type === "file"
          ? null
          : field.type === "location" || field.type === "phone"
            ? {}
            : ""

      transformedValues[fieldId] = defaultValue
    }
  })

  console.log('Final transformed values for form:', transformedValues)

  // Debug: Check for file fields specifically
  const fileFields = fields.filter(f => f.type === 'file')
  if (fileFields.length > 0) {
    console.log('📁 File fields found:', fileFields.map(f => ({ id: f.id, label: f.label })))
    fileFields.forEach(field => {
      const value = transformedValues[field.id]
      console.log(`📁 File field ${field.id} (${field.label}):`, {
        hasValue: !!value,
        valueType: typeof value,
        isFileObject: value && typeof value === 'object' && value.name && value.base64,
        value: value
      })
    })
  }

  return transformedValues
}

export default function PublicFormPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const formId = params.formId
  const token = searchParams.get('token')
  const submissionId = searchParams.get('submission_id')
  const userIdFromUrl = searchParams.get('user_id')
  const versionParam = searchParams.get('version')

  // Properly handle null, undefined, or "undefined" string values
  const tokens = authUtils.getTokens()
  const storedUserId =
    tokens?.user?.user_id ||
    tokens?.user?.id ||
    tokens?.user_id ||
    tokens?.userId ||
    null

  const finalUserId =
    (userIdFromUrl && userIdFromUrl !== 'undefined' && userIdFromUrl !== 'null')
      ? userIdFromUrl
      : (storedUserId || FALLBACK_USER_ID)

  const [formData, setFormData] = useState(null)
  const [submissionData, setSubmissionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [submissionSuccess, setSubmissionSuccess] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [editCountLeft, setEditCountLeft] = useState(null)
  const [isEditable, setIsEditable] = useState(true)
  const [latestVersion, setLatestVersion] = useState(null)
  const [isVersionReadOnly, setIsVersionReadOnly] = useState(false)
  const [lastSubmissionId, setLastSubmissionId] = useState(null)
  const [lastSubmissionToken, setLastSubmissionToken] = useState(null)
  const [phoneCountries, setPhoneCountries] = useState([])
  const [formInitialized, setFormInitialized] = useState(false)

  useEffect(() => {
    if (formId) {
      // Check for existing submission first
      const hasExistingSubmission = checkExistingSubmission()

      // Always fetch form data to verify version (even if submission exists)
      // This ensures we clear FORM_SUBMITTED if version has changed
      if (!token && !submissionId) {
        fetchFormData()
      } else if (token && submissionId) {
        // In edit mode - fetch form data will happen via fetchSubmissionData
      }
    }
  }, [formId, token, submissionId])

  // Load phone countries from API
  useEffect(() => {
    const loadPhoneCountries = async () => {
      try {
        const countries = await fetchPhoneCountries()
        setPhoneCountries(countries)
      } catch (error) {
        console.error('Failed to load phone countries:', error)
        toast.error('Failed to load phone countries')
      }
    }

    loadPhoneCountries()
  }, [])

  useEffect(() => {
    if (token && submissionId) {
      console.log('Edit mode activated with:', { token, submissionId })
      setIsEditMode(true)
      fetchSubmissionData()
    } else {
      console.log('Not in edit mode, checking for existing submission')
      checkExistingSubmission()
    }
  }, [token, submissionId, formId, userIdFromUrl])

  // Enforce view-only in edit mode if the submission's form version is older than latest
  useEffect(() => {
    const enforceEditModeVersion = async () => {
      if (!formId || !isEditMode || !formData?.version) return
      try {
        const baseUrl = `${API_BASE_URL}/api/forms/${ORGANIZATION_ID}/${TABLE_ID}/${formId}`
        const latestResp = await axios.get(baseUrl, {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          }
        })
        const latestRes = latestResp.data
        if (latestRes?.success && latestRes?.data) {
          const latestVer = latestRes.data.version || null
          setLatestVersion(latestVer)
          if (latestVer && Number(formData.version) < Number(latestVer)) {
            setIsEditable(false)
            setIsVersionReadOnly(true)
          }
        }
      } catch (e) {
        console.warn('Failed to check latest version for edit mode:', e?.message)
      }
    }
    enforceEditModeVersion()
  }, [formId, isEditMode, formData?.version])

  const checkExistingSubmission = () => {
    try {
      const savedFormId = localStorage.getItem("FORM_ID")
      const savedSubmissionId = localStorage.getItem("SUBMISSION_ID")
      const savedEditToken = localStorage.getItem("EDIT_TOKEN")
      const isSubmitted = localStorage.getItem("FORM_SUBMITTED") === 'true'
      const savedVersion = localStorage.getItem("FORM_VERSION")

      // Check if form ID matches
      if (savedFormId === formId && savedSubmissionId && savedEditToken && isSubmitted) {
        // If version is specified in URL, check if it matches saved version
        if (versionParam && savedVersion) {
          const currentVersion = String(versionParam)
          const storedVersion = String(savedVersion)

          // If versions don't match, clear the submission data (new version created)
          if (currentVersion !== storedVersion) {
            console.log(`Version mismatch: current=${currentVersion}, stored=${storedVersion}. Clearing FORM_SUBMITTED.`)
            clearSubmissionFromStorage()
            return false
          }
        }

        // Set the submission success state to show the success page
        setLastSubmissionId(savedSubmissionId)
        setLastSubmissionToken(savedEditToken)
        setSubmissionSuccess(true)
        return true
      } else {
        setSubmissionSuccess(false)
        return false
      }
    } catch (error) {
      console.error('Error checking localStorage:', error)
      setSubmissionSuccess(false)
      return false
    }
  }

  const saveSubmissionToStorage = (submissionId, editToken) => {
    try {
      const currentVersion = versionParam || (formData?.version ? String(formData.version) : '1')

      localStorage.setItem("SUBMISSION_ID", submissionId)
      localStorage.setItem("EDIT_TOKEN", editToken)
      localStorage.setItem("FORM_SUBMITTED", 'true')
      localStorage.setItem("FORM_ID", formId)
      localStorage.setItem("FORM_VERSION", currentVersion)

      console.log('Successfully saved to localStorage:', {
        submissionId,
        editToken,
        formId,
        version: currentVersion
      })
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      toast.error("Failed to save submission data locally")
    }
  }

  const clearSubmissionFromStorage = () => {
    try {
      localStorage.removeItem("SUBMISSION_ID")
      localStorage.removeItem("EDIT_TOKEN")
      localStorage.removeItem("FORM_SUBMITTED")
      localStorage.removeItem("FORM_ID")
      localStorage.removeItem("FORM_VERSION")

      setSubmissionSuccess(false)
      setLastSubmissionId(null)
      setLastSubmissionToken(null)
      setSubmissionData(null)
      setIsEditMode(false)

      console.log('Cleared submission data from localStorage')
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }

  const fetchSubmissionData = async () => {
    if (!token || !submissionId) {
      console.error('Missing token or submissionId:', { token, submissionId })
      return
    }

    try {

      const response = await axios.post(
        `${API_BASE_URL}/api/submit/edit?token=${token}`,
        {
          organization_id: ORGANIZATION_ID,
          form_id: formId,
          reference_id: finalUserId,
          submission_id: submissionId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      const result = response.data

      console.log('Full editFormHandler API response:', result)

      // Handle the response format where values are JSON strings
      if (result.success && result.data?.submission) {

        // Capture editable flag from API response
        const editable = result.editable !== undefined ? result.editable : true
        setIsEditable(editable)

        // Parse any JSON strings in the values
        const parsedSubmission = {
          ...result.data.submission,
          values: {}
        }

        // Parse each field value if it's a JSON string and transform nested structure
        Object.keys(result.data.submission.values || {}).forEach(key => {
          const value = result.data.submission.values[key]
          if (typeof value === 'string') {
            try {
              const parsedValue = JSON.parse(value)
              parsedSubmission.values[key] = parsedValue
            } catch (e) {
              parsedSubmission.values[key] = value
            }
          } else {
            parsedSubmission.values[key] = value
          }
        })

        console.log('📝 Setting submission data:', parsedSubmission)

        setSubmissionData(parsedSubmission)

        // Extract edit count from submission data if available
        if (parsedSubmission.editCountLeft !== undefined) {
          setEditCountLeft(parsedSubmission.editCountLeft)
        }

        // Handle original form version for editing
        if (result.form_version) {
          // Check if form_version is just a number (version ID) or a full form object
          if (typeof result.form_version === 'number' || typeof result.form_version === 'string') {
            // Fetch the specific form version from the backend
            try {

              // Try the most common API pattern: query parameter
              const versionResponse = await axios.get(
                `${API_BASE_URL}/api/forms/${ORGANIZATION_ID}/${TABLE_ID}/${formId}?version=${result.form_version}`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                  }
                }
              )

              if (versionResponse.data.success && versionResponse.data.data) {
                const originalFormData = parseFormData(versionResponse.data.data)
                setFormData(originalFormData)
                setLoading(false)
                toast.success(`Submission loaded - Using original form v${result.form_version}`)
              } else {
                throw new Error('Failed to fetch form version data')
              }
            } catch (versionError) {

              console.warn('⚠️ First attempt failed, trying alternative endpoint patterns:', versionError.message)

              // Try alternative API patterns
              let alternativeSuccess = false
              const alternativeEndpoints = [
                `${API_BASE_URL}/api/forms/version/${formId}/${result.form_version}`,
                `${API_BASE_URL}/api/forms/${formId}/version/${result.form_version}`,
                `${API_BASE_URL}/api/forms/${ORGANIZATION_ID}/${formId}/version/${result.form_version}`,
                `${API_BASE_URL}/api/forms/${ORGANIZATION_ID}/${TABLE_ID}/${formId}/version/${result.form_version}`
              ]

              for (const endpoint of alternativeEndpoints) {
                try {
                  const altResponse = await axios.get(endpoint, {
                    headers: {
                      'Authorization': authUtils.getAuthHeader(),
                      'Content-Type': 'application/json',
                    }
                  })

                  if (altResponse.data.success && altResponse.data.form) {
                    const originalFormData = parseFormData(altResponse.data.form)
                    setFormData(originalFormData)
                    setLoading(false)
                    toast.success(`Submission loaded - Using original form v${result.form_version}`)
                    alternativeSuccess = true
                    break
                  }
                } catch (altError) {
                  continue
                }
              }

              if (!alternativeSuccess) {
                console.warn('⚠️ All form version endpoints failed, falling back to latest form')
                try {
                  await fetchFormData() // This will set loading to false when it completes
                } catch (fetchError) {
                  console.error('❌ Fallback fetchFormData also failed:', fetchError)
                  setLoading(false) // ✅ FIX: Ensure loading stops even if fallback fails
                }
                toast.warning("Submission loaded - Using latest form version (original version endpoints not available)")
              }
            }
          } else {
            // form_version is a full form object
            try {
              const originalFormData = parseFormData(result.form_version)
              setFormData(originalFormData)
              setLoading(false)
              toast.success(`Submission loaded - Using original form v${result.form_version.version || 'unknown'}`)
            } catch (error) {
              console.error('❌ Error parsing original form data:', error)
              // Fallback to fetching latest form if original parsing fails
              try {
                await fetchFormData()
              } catch (fetchError) {
                console.error('❌ Fallback fetchFormData failed:', fetchError)
                setLoading(false)
              }
              toast.warning("Submission loaded - Using latest form version (original failed to load)")
            }
          }
        } else {
          // Fallback to fetching latest form
          try {
            await fetchFormData()
          } catch (fetchError) {
            console.error('❌ Fallback fetchFormData failed:', fetchError)
            setLoading(false)
          }
          toast.warning("Submission loaded - Using latest form version (original not available)")
        }
      } else if (result.data) {
        // Handle case where submission data is in result.data
        setSubmissionData(result.data)

        // Capture editable flag from API response
        const editable = result.editable !== undefined ? result.editable : true
        console.log('📝 Editable flag from API (data branch):', editable)
        setIsEditable(editable)

        // Extract edit count from submission data if available
        if (result.data.editCountLeft !== undefined) {
          setEditCountLeft(result.data.editCountLeft)
        }

        // Handle original form version for editing (alternative location)
        if (result.form_version) {
          try {
            const originalFormData = parseFormData(result.form_version)
            setFormData(originalFormData)
            setLoading(false)
            toast.success(`Submission loaded - Using original form v${result.form_version.version || 'unknown'}`)
          } catch (error) {
            console.error('❌ Error parsing original form data:', error)
            try {
              await fetchFormData()
            } catch (fetchError) {
              console.error('❌ Fallback fetchFormData failed:', fetchError)
              setLoading(false)
            }
            toast.warning("Submission loaded - Using latest form version (original failed to load)")
          }
        } else {
          try {
            await fetchFormData()
          } catch (fetchError) {
            console.error('❌ Fallback fetchFormData failed:', fetchError)
            setLoading(false)
          }
          toast.warning("Submission loaded - Using latest form version (original not available)")
        }
      } else if (result.values) {
        // Handle case where values are directly in result
        setSubmissionData({ values: result.values })

        // Capture editable flag from API response
        const editable = result.editable !== undefined ? result.editable : true
        console.log('📝 Editable flag from API (values branch):', editable)
        setIsEditable(editable)

        // Extract edit count from result if available
        if (result.editCountLeft !== undefined) {
          setEditCountLeft(result.editCountLeft)
        }

        // Handle original form version for editing (alternative location)
        if (result.form_version) {
          try {
            const originalFormData = parseFormData(result.form_version)
            setFormData(originalFormData)
            setLoading(false)
            toast.success(`Submission loaded - Using original form v${result.form_version.version || 'unknown'}`)
          } catch (error) {
            console.error('❌ Error parsing original form data:', error)
            try {
              await fetchFormData()
            } catch (fetchError) {
              console.error('❌ Fallback fetchFormData failed:', fetchError)
              setLoading(false)
            }
            toast.warning("Submission loaded - Using latest form version (original failed to load)")
          }
        } else {
          try {
            await fetchFormData()
          } catch (fetchError) {
            console.error('❌ Fallback fetchFormData failed:', fetchError)
            setLoading(false)
          }
          toast.warning("Submission loaded - Using latest form version (original not available)")
        }
      } else {
        console.warn('Unexpected response format:', result)
        setLoading(false) // ✅ FIX: Stop loading even on unexpected response format
        throw new Error('Submission data not found in response')
      }

    } catch (error) {
      console.error('Error fetching submission data:', error)
      setLoading(false) // ✅ FIX: Stop loading on error

      // Check for specific error messages
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error

        // Handle edit limit reached error
        if (errorMessage.includes("Edit limit reached") || errorMessage.includes("edit this form only")) {
          toast.error(errorMessage)
        } else {
          toast.error(`Unable to load submission data: ${errorMessage}`)
        }
      } else {
        toast.error(`Unable to load submission data: ${error.message}`)
      }
    }
  }

  // Helper function to parse nested fields
  const parseNestedFields = (nestedFieldsArray) => {
    if (!Array.isArray(nestedFieldsArray)) return []

    return nestedFieldsArray.map(nestedField => {
      // Parse options if they exist as JSON string
      let options = []
      if (nestedField.options) {
        if (typeof nestedField.options === 'string') {
          try {
            options = JSON.parse(nestedField.options)
          } catch (e) {
            console.warn('Failed to parse nested field options:', nestedField.options)
            options = []
          }
        } else if (Array.isArray(nestedField.options)) {
          options = nestedField.options
        }
      }

      // Recursively parse nested fields within options
      const processedOptions = options.map(option => {
        const processedOption = {
          value: option.value || option,
          label: option.label || option.value || option,
          nestedFields: []
        }

        // Recursively process nested fields for this option
        if (option.nestedFields && Array.isArray(option.nestedFields)) {
          processedOption.nestedFields = parseNestedFields(option.nestedFields)
        }

        return processedOption
      })

      return {
        id: nestedField.id,
        name: nestedField.name,
        label: nestedField.label,
        type: nestedField.type,
        required: nestedField.required === true || nestedField.required === 'true',
        validations: typeof nestedField.validations === 'string' ?
          JSON.parse(nestedField.validations || '{}') :
          (nestedField.validations || {}),
        hasNested: nestedField.hasNested === true || nestedField.hasNested === 'true',
        isLeadColumn: nestedField.isLeadColumn === true || nestedField.isLeadColumn === 'true',
        options: processedOptions
      }
    })
  }

  // Helper function to generate unique field IDs
  const generateUniqueFieldId = (prefix = 'field') => {
    const uniqueId = uuidv4()
    return uniqueId
  }

  // Helper function to parse form data from API
  const parseFormData = (apiForm) => {
    try {
      let parsedFields = []

      console.log('Raw API form fields:', apiForm.fields)

      // Handle different field formats
      if (Array.isArray(apiForm.fields)) {
        parsedFields = apiForm.fields.map((field, index) => {
          let fieldData = field

          // Case 1: Field is an object with numeric keys (character-by-character JSON)
          if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
            const keys = Object.keys(field).filter(key => !isNaN(key))

            if (keys.length > 0) {
              try {
                // Reconstruct the JSON string by sorting numeric keys and joining characters
                const jsonString = keys
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map(key => field[key])
                  .join('')

                console.log(`Reconstructed JSON for field ${index}:`, jsonString)

                if (jsonString.trim()) {
                  fieldData = JSON.parse(jsonString)
                }
              } catch (parseError) {
                console.error(`Failed to parse reconstructed JSON for field ${index}:`, parseError)
              }
            }
          }

          // Case 2: Field is a JSON string
          if (typeof fieldData === 'string') {
            try {
              fieldData = JSON.parse(fieldData)
            } catch (parseError) {
              console.warn(`Failed to parse field ${index} as JSON string:`, fieldData)
            }
          }

          // Now process the field data
          if (fieldData && typeof fieldData === 'object') {
            console.log(`Processing field ${index}:`, fieldData)

            // Parse options from JSON string if needed
            let options = []
            if (fieldData.options) {
              if (typeof fieldData.options === 'string') {
                try {
                  options = JSON.parse(fieldData.options)
                } catch (e) {
                  console.error(`❌ Failed to parse options for field ${fieldData.label}:`, e)
                  // Fallback: try to split by commas for simple options
                  if (typeof fieldData.options === 'string') {
                    options = fieldData.options.split(',').map(opt => opt.trim()).filter(opt => opt)
                  }
                }
              } else if (Array.isArray(fieldData.options)) {
                options = fieldData.options
              }
            }

            // Recursively process nested fields structure
            const processedOptions = options.map(option => {
              const processedOption = {
                value: option.value || option,
                label: option.label || option.value || option,
                nestedFields: []
              }

              // Recursively process nested fields for this option
              if (option.nestedFields && Array.isArray(option.nestedFields)) {
                processedOption.nestedFields = parseNestedFields(option.nestedFields)
              }

              return processedOption
            })


            // Parse validation
            let validation = {}
            if (fieldData.validations) {
              if (typeof fieldData.validations === 'string') {
                try {
                  validation = JSON.parse(fieldData.validations)
                } catch (e) {
                  console.warn('Failed to parse validations as JSON:', fieldData.validations)
                }
              } else if (typeof fieldData.validations === 'object') {
                validation = fieldData.validations
              }
            } else if (fieldData.validation) {
              if (typeof fieldData.validation === 'string') {
                try {
                  validation = JSON.parse(fieldData.validation)
                } catch (e) {
                  console.warn('Failed to parse validation as JSON:', fieldData.validation)
                }
              } else if (typeof fieldData.validation === 'object') {
                validation = fieldData.validation
              }
            }

            // Handle required field
            const isRequired = fieldData.required === true || fieldData.required === 'true' || false

            // Build nestedFields structure for backward compatibility with FieldRenderer
            const nestedFields = {}
            processedOptions.forEach((option, optionIndex) => {
              if (option.nestedFields && option.nestedFields.length > 0) {
                nestedFields[optionIndex] = option.nestedFields.map(nestedField => ({
                  id: nestedField.id,
                  name: nestedField.name,
                  type: nestedField.type,
                  label: nestedField.label,
                  placeholder: nestedField.placeholder || '',
                  required: nestedField.required || false,
                  validation: nestedField.validations || {},
                  options: nestedField.options || [],
                  nestedFields: nestedField.nestedFields || {}
                }))
              }
            })

            const parsedField = {
              id: fieldData.id || fieldData.name || generateUniqueFieldId(),
              originalId: fieldData.id,
              name: fieldData.name,
              type: fieldData.type || 'text',
              label: fieldData.label || fieldData.name || 'Field',
              placeholder: fieldData.placeholder || '',
              required: isRequired,
              isLeadColumn: fieldData.isLeadColumn === true || fieldData.isLeadColumn === 'true',
              options: processedOptions.map(opt => opt.value || opt),
              nestedFields: nestedFields,
              validation: {
                required: isRequired,
                multiple: validation.multiple || false,
                min: validation.min,
                max: validation.max,
                accept: validation.accept,
                pattern: validation.pattern,
                ...validation
              },
              // Store the full processed options for nested rendering
              _processedOptions: processedOptions
            }

            return parsedField
          }

          // Default fallback
          return {
            id: generateUniqueFieldId(),
            type: 'text',
            label: 'Text Field',
            placeholder: 'Enter text',
            required: false,
            options: [],
            nestedFields: {},
            validation: {
              required: false,
              multiple: false
            }
          }
        })
      }

      // Parse group fields from API and add them to parsedFields
      if (apiForm.group) {
        let groupData = apiForm.group

        // Parse group if it's a JSON string
        if (typeof groupData === 'string') {
          try {
            groupData = JSON.parse(groupData)
          } catch (e) {
            console.warn('Failed to parse group data:', e)
            groupData = []
          }
        }

        if (Array.isArray(groupData)) {
          // Collect all field IDs that belong to groups
          const groupFieldIds = new Set()

          groupData.forEach(group => {
            // Build subFields from the group's fields array
            const subFields = []
            if (group.fields && Array.isArray(group.fields)) {
              group.fields.forEach(fieldRef => {
                // Check if fieldRef is a string (field ID reference)
                if (typeof fieldRef === 'string') {
                  // Find the matching field in parsedFields by ID
                  const matchingField = parsedFields.find(f => f.id === fieldRef || f.originalId === fieldRef)
                  if (matchingField) {
                    subFields.push(matchingField)
                    groupFieldIds.add(fieldRef)
                  }
                }
                // Check if fieldRef is a full field object (has type property)
                else if (typeof fieldRef === 'object' && fieldRef.type) {
                  // Parse the subfield like a regular field
                  let validation = {}
                  if (fieldRef.validations) {
                    if (typeof fieldRef.validations === 'string') {
                      try {
                        validation = JSON.parse(fieldRef.validations)
                      } catch (e) {
                        console.warn('Failed to parse subfield validations:', fieldRef.validations)
                      }
                    } else if (typeof fieldRef.validations === 'object') {
                      validation = fieldRef.validations
                    }
                  }

                  // Parse options if they exist
                  let options = []
                  if (fieldRef.options) {
                    if (typeof fieldRef.options === 'string') {
                      try {
                        options = JSON.parse(fieldRef.options)
                      } catch (e) {
                        console.warn('Failed to parse subfield options:', fieldRef.options)
                        options = []
                      }
                    } else if (Array.isArray(fieldRef.options)) {
                      options = fieldRef.options
                    }
                  }

                  const parsedSubField = {
                    id: fieldRef.id,
                    name: fieldRef.name || fieldRef.id,
                    type: fieldRef.type,
                    label: fieldRef.label || fieldRef.name || 'Field',
                    placeholder: fieldRef.placeholder || '',
                    required: fieldRef.required === true || fieldRef.required === 'true' || false,
                    options: options.map(opt => typeof opt === 'object' ? opt.value || opt : opt),
                    nestedFields: {},
                    isLeadColumn: fieldRef.isLeadColumn === true || fieldRef.isLeadColumn === 'true' || false,
                    validation: validation,
                    _processedOptions: options.map(opt => ({
                      value: typeof opt === 'object' ? opt.value || opt : opt,
                      label: typeof opt === 'object' ? opt.label || opt.value || opt : opt,
                      nestedFields: []
                    }))
                  }

                  subFields.push(parsedSubField)
                  groupFieldIds.add(fieldRef.id)
                }
              })
            }

            // Create the group field object
            const groupField = {
              id: group.id,
              name: group.name,
              type: 'group',
              label: group.label || group.name || 'Group',
              required: group.required === true || group.required === 'true' || false,
              subFields: subFields
            }

            // Add the group field to parsedFields
            parsedFields.push(groupField)
          })

          // Remove fields that belong to groups from the main parsedFields array
          // (they should only appear inside their group)
          const fieldsNotInGroups = parsedFields.filter(f =>
            f.type === 'group' || !groupFieldIds.has(f.id) && !groupFieldIds.has(f.originalId)
          )

          // Replace parsedFields with the filtered version
          parsedFields.length = 0
          parsedFields.push(...fieldsNotInGroups)
        }
      }

      const parsedForm = {
        form_name: apiForm.form_name || apiForm.name || 'Untitled Form',
        description: apiForm.description || '',
        retry_count: apiForm.retry_count || '2',
        version: apiForm.version || null,
        archived: apiForm.archived || false,
        fields: parsedFields
      }

      return parsedForm

    } catch (error) {
      console.error('❌ Error parsing form data:', error)
      throw new Error('Failed to parse form data: ' + error.message)
    }
  }

  const fetchFormData = async () => {
    try {
      const baseUrl = `${API_BASE_URL}/api/forms/${ORGANIZATION_ID}/${TABLE_ID}/${formId}`

      let result
      let usedVersionEndpoint = null

      if (versionParam) {
        // Try primary query-param endpoint first
        const primaryUrl = `${baseUrl}?version=${versionParam}`
        try {
          const resp = await axios.get(primaryUrl, {
            headers: {
              'Authorization': authUtils.getAuthHeader(),
              'Content-Type': 'application/json',
            }
          })
          // Handle both response formats - with wrapper and without
          if (resp.data) {
            result = resp.data.success ? resp.data.data : resp.data
            usedVersionEndpoint = primaryUrl
          } else {
            throw new Error('Versioned form not returned')
          }
        } catch (e1) {
          // Try alternative endpoints
          const alternatives = [
            `${API_BASE_URL}/api/forms/version/${formId}/${versionParam}`,
            `${API_BASE_URL}/api/forms/${formId}/version/${versionParam}`,
            `${API_BASE_URL}/api/forms/${ORGANIZATION_ID}/${formId}/version/${versionParam}`,
            `${API_BASE_URL}/api/forms/${ORGANIZATION_ID}/${TABLE_ID}/${formId}/version/${versionParam}`
          ]
          for (const alt of alternatives) {
            try {
              const altResp = await axios.get(alt, {
                headers: {
                  'Authorization': authUtils.getAuthHeader(),
                  'Content-Type': 'application/json',
                }
              })
              if (altResp.data) {
                result = altResp.data.success ? altResp.data.data : altResp.data
                usedVersionEndpoint = alt
                break
              }
            } catch { }
          }
        }
      }

      // Fallback to latest if no version or version-specific fetch failed
      if (!result) {
        const response = await axios.get(baseUrl, {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          }
        })
        // Handle both response formats
        result = response.data.success ? response.data.data : response.data
      }

      // Check if we got form data (result should be the form object)
      if (result && (result.fields || result.form_name)) {
        if (versionParam) {
          console.log('Form version load:', { requestedVersion: versionParam, usedVersionEndpoint })
        }

        try {
          // Also fetch latest to determine read-only state when a specific version is requested
          const latestResp = await axios.get(baseUrl, {
            headers: {
              'Authorization': authUtils.getAuthHeader(),
              'Content-Type': 'application/json',
            }
          })
          const latestRes = latestResp.data
          const latestData = latestRes.success ? latestRes.data : latestRes
          if (latestData) {
            const latestVer = latestData.version || null
            setLatestVersion(latestVer)
            if (versionParam && latestVer && Number(versionParam) < Number(latestVer)) {
              setIsVersionReadOnly(true)
            } else {
              setIsVersionReadOnly(false)
            }
          }
        } catch (e) {
          console.warn('Unable to fetch latest form version for comparison:', e?.message)
        }

        // Check if form is archived/inactive
        if (result.archived || result.isarchieved || result.status === false) {
          console.log('⚠️ Form is archived/inactive:', result.archived, result.isarchieved, result.status)
          setFormData({
            form_name: result.form_name || 'Form Unavailable',
            description: 'This form is currently inactive and cannot accept submissions.',
            retry_count: result.max_retry_count || result.retry_count || '2',
            fields: [],
            archived: true
          })
          return
        }

        try {
          const parsedForm = parseFormData(result)
          setFormData(parsedForm)

          // Check if version has changed and clear FORM_SUBMITTED if it has
          const currentFormVersion = String(result.version || versionParam || '1')
          const savedFormId = localStorage.getItem("FORM_ID")
          const savedVersion = localStorage.getItem("FORM_VERSION")

          if (savedFormId === formId && savedVersion) {
            const storedVersion = String(savedVersion)
            if (currentFormVersion !== storedVersion) {
              console.log(`Version changed: current=${currentFormVersion}, stored=${storedVersion}. Clearing FORM_SUBMITTED for previous version.`)
              // Clear FORM_SUBMITTED for previous version
              localStorage.removeItem("FORM_SUBMITTED")
              localStorage.removeItem("SUBMISSION_ID")
              localStorage.removeItem("EDIT_TOKEN")
              localStorage.removeItem("FORM_VERSION")
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing form data:', parseError)
          toast.error('Failed to parse form data. The form may be corrupted.')
          setFormData({
            form_name: 'Error Loading Form',
            description: 'Unable to load form data',
            retry_count: '2',
            fields: []
          })
        }
      } else {
        throw new Error('Form data not found in response: ' + JSON.stringify(result))
      }

    } catch (error) {
      console.error('❌ Error fetching form:', error)

      if (error.response?.status === 404) {
        toast.error(`Form not found. The form with ID "${formId}" does not exist or has been deleted.`)
        setFormData({
          form_name: 'Form Not Found',
          description: 'The requested form could not be found.',
          retry_count: '2',
          fields: []
        })
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please check your authentication token.')
        setFormData({
          form_name: 'Authentication Error',
          description: 'Unable to access this form due to authentication issues.',
          retry_count: '2',
          fields: []
        })
      } else if (error.response?.status === 403) {
        toast.error('Access forbidden. You do not have permission to access this form.')
        setFormData({
          form_name: 'Access Denied',
          description: 'You do not have permission to access this form.',
          retry_count: '2',
          fields: []
        })
      } else {
        toast.error(`Failed to load form: ${error.message}`)
        setFormData({
          form_name: 'Error Loading Form',
          description: 'An error occurred while loading the form.',
          retry_count: '2',
          fields: []
        })
      }

    } finally {
      setLoading(false)
    }
  }

  const getDefaultValues = () => {
    if (!formData?.fields) {
      return {}
    }

    // If we have submission data in edit mode, use that
    if (isEditMode && submissionData && submissionData.values) {
      console.log('📝 Processing submission data for edit mode:', {
        submissionValues: submissionData.values,
        submissionDataKeys: Object.keys(submissionData.values),
        formFields: formData.fields.map(f => ({ id: f.id, name: f.name, label: f.label, type: f.type }))
      })

      const values = transformSubmissionValues(submissionData.values, formData.fields, phoneCountries)
      return values
    }

    // Otherwise, use empty defaults
    const emptyValues = formData.fields.reduce((acc, field) => {
      const fieldId = field.id

      if (["select", "checkbox", "radio"].includes(field.type)) {
        if (field.type === "checkbox" || (field.type === "select" && field.validation?.multiple)) {
          acc[fieldId] = {
            value: [],
            nestedFields: {}
          }
        } else {
          acc[fieldId] = {
            value: "",
            nestedFields: {}
          }
        }
      } else if (field.type === "file") {
        acc[fieldId] = null
      } else if (field.type === "location" || field.type === "phone") {
        acc[fieldId] = {}
      } else if (field.type === "group") {
        // Initialize group fields as empty object to store subField values
        acc[fieldId] = {}
      } else {
        acc[fieldId] = ""
      }

      return acc
    }, {})

    console.log('Empty default values:', emptyValues)
    return emptyValues
  }

  const handleEditResponse = () => {
    const savedSubmissionId = localStorage.getItem("SUBMISSION_ID")
    const savedEditToken = localStorage.getItem("EDIT_TOKEN")

    console.log('Edit response data:', {
      savedSubmissionId,
      savedEditToken,
      lastSubmissionId,
      lastSubmissionToken
    })

    if (savedSubmissionId && savedEditToken) {
      const editUrl = `${window.location.origin}${window.location.pathname}?token=${savedEditToken}&submission_id=${savedSubmissionId}`
      window.location.href = editUrl
    } else if (lastSubmissionId && lastSubmissionToken) {
      const editUrl = `${window.location.origin}${window.location.pathname}?token=${lastSubmissionToken}&submission_id=${lastSubmissionId}`
      console.log('Navigating to edit URL (fallback):', editUrl)
      window.location.href = editUrl
    } else {
      console.error("Missing submission ID or token for editing", {
        savedSubmissionId,
        savedEditToken,
        lastSubmissionId,
        lastSubmissionToken
      })
      toast.error("Unable to edit response. Missing submission data.")
    }
  }

  const getEmptyFormValues = () => {
    if (!formData?.fields) return {}

    return formData.fields.reduce((acc, field) => {
      const fieldId = field.id

      if (["select", "checkbox", "radio"].includes(field.type)) {
        if (field.type === "checkbox" || (field.type === "select" && field.validation?.multiple)) {
          acc[fieldId] = {
            value: [],
            nestedFields: {}
          }
        } else {
          acc[fieldId] = {
            value: "",
            nestedFields: {}
          }
        }
      } else if (field.type === "file") {
        acc[fieldId] = null
      } else if (field.type === "location" || field.type === "phone") {
        acc[fieldId] = {}
      } else {
        acc[fieldId] = ""
      }

      return acc
    }, {})
  }

  const handleClearSubmission = () => {
    clearSubmissionFromStorage()
    toast.success("Submission cleared. You can now submit a new response.")
  }

  const validateField = (field, value) => {
    const errors = []

    // Required validation
    if (field.required || field.validation?.required) {
      if (field.type === "checkbox" || (field.type === "select" && field.validation?.multiple)) {
        // For multi-select and checkbox, value can be an array directly or { value: [...] }
        let arrayValue = value
        if (typeof value === 'object' && value !== null && Array.isArray(value.value)) {
          arrayValue = value.value
        }
        if (!Array.isArray(arrayValue) || arrayValue.length === 0) {
          errors.push("This field is required")
        }
      } else if (field.type === "file") {
        if (!value) {
          errors.push("Please select a file")
        }
      } else if (field.type === "location") {
        const v = value || {}
        if (!v.country) {
          errors.push("Please select a country")
        } else if (!v.state) {
          errors.push("Please select a state")
        } else if (!v.city) {
          errors.push("Please select a city")
        }
      } else if (field.type === "phone") {
        const v = value || {}
        if (!v.country) {
          errors.push("Please select a country code")
        } else if (!v.number || String(v.number).trim() === "") {
          errors.push("Please enter a phone number")
        }
      } else if (!value || (typeof value === "string" && value.trim() === "")) {
        errors.push("This field is required")
      }
    }

    // Type-specific validation
    if (value && ((typeof value === "string" && value.trim() !== "") || field.type === "phone" || field.type === "file")) {
      switch (field.type) {
        case "email":
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value)) {
            errors.push("Please enter a valid email address")
          }
          break

        case "number":
          const numValue = Number(value)
          if (isNaN(numValue)) {
            errors.push("Please enter a valid number")
          } else {
            if (field.validation?.min !== undefined && numValue < field.validation.min) {
              errors.push(`Value must be at least ${field.validation.min}`)
            }
            if (field.validation?.max !== undefined && numValue > field.validation.max) {
              errors.push(`Value must be at most ${field.validation.max}`)
            }
          }
          break

        case "phone": {
          const v = value || {}
          const phoneCountry = phoneCountries.find(c => c.code === v.country) || phoneCountries[0]
          const digits = String(v.number || "").replace(/\D/g, "")
          const expectedLength = phoneCountry?.len || 10

          if (digits.length !== expectedLength) {
            errors.push(`Phone number must be ${expectedLength} digits for ${phoneCountry.label}`)
          }
          break
        }

        case "location": {
          const v = value || {}

          // Check if validation restrictions are defined
          if (field.validation?.allowedCountries || field.validation?.allowedStates || field.validation?.allowedCities) {
            // Validate country selection
            if (v.country && field.validation?.allowedCountries) {
              const selectedCountry = countries.find(c => c.id === parseInt(v.country))
              if (selectedCountry && !field.validation.allowedCountries.includes(selectedCountry.name)) {
                errors.push(`Country "${selectedCountry.name}" is not allowed`)
              }
            }

            // Validate state selection
            if (v.state && field.validation?.allowedStates && v.country) {
              const selectedCountry = countries.find(c => c.id === parseInt(v.country))
              if (selectedCountry && field.validation.allowedStates[selectedCountry.name]) {
                const selectedState = states.find(s => s.id === parseInt(v.state))
                if (selectedState && !field.validation.allowedStates[selectedCountry.name].includes(selectedState.name)) {
                  errors.push(`State "${selectedState.name}" is not allowed for ${selectedCountry.name}`)
                }
              }
            }

            // Validate city selection
            if (v.city && field.validation?.allowedCities && v.state) {
              const selectedState = states.find(s => s.id === parseInt(v.state))
              if (selectedState && field.validation.allowedCities[selectedState.name]) {
                const selectedCity = cities.find(c => c.id === parseInt(v.city))
                if (selectedCity && !field.validation.allowedCities[selectedState.name].includes(selectedCity.name)) {
                  errors.push(`City "${selectedCity.name}" is not allowed for ${selectedState.name}`)
                }
              }
            }
          }
          break
        }

        case "file":
          // File validation - use selected file type from field configuration
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
            errorMessage = "Please select only image files (JPEG, PNG, GIF, WebP, SVG)"
          } else if (fileType === "pdf") {
            // PDF-only field
            allowedTypes = ['application/pdf']
            allowedExtensions = ['.pdf']
            errorMessage = "Please select only PDF files"
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
            errorMessage = "Please select only image files (JPEG, PNG, GIF, WebP, SVG) or PDF files"
          }

          if (value) {
            // Check both MIME type and file extension
            const isValidType = allowedTypes.includes(value.type) ||
              allowedExtensions.some(ext => value.name.toLowerCase().endsWith(ext))

            if (!isValidType) {
              errors.push(errorMessage)
            }

            const maxSize = 5 * 1024 * 1024 // 5MB
            if (value.size > maxSize) {
              errors.push("File size must be less than 5MB")
            }

            // Validate base64 data exists for new uploads
            if (!value.base64 && !value.isFromBase64) {
              errors.push("Error processing file. Please try uploading again.")
            }
          }
          break
      }
    }

    return errors
  }

  const form = useForm({
    defaultValues: getDefaultValues(),
    onSubmit: async ({ value }) => {
      console.log('Form values:', value)

      setSubmitting(true)
      try {
        // Transform form values to match API expected format
        const transformedValues = transformFormValues(value, formData?.fields || [], phoneCountries)

        if (isEditMode) {
          console.log('=== UPDATE DEBUG ===')
          console.log('Original form values:', value)
          console.log('Transformed values:', transformedValues)
          console.log('Form schema fields:', formData.fields.map(f => ({
            id: f.id,
            originalId: f.originalId,
            type: f.type,
            label: f.label
          })))

          // Check if nested field IDs match between form schema and values
          formData.fields.forEach(field => {
            if (field._processedOptions) {
              field._processedOptions.forEach((option, idx) => {
                if (option.nestedFields && option.nestedFields.length > 0) {
                  console.log(`Option "${option.value}" nested fields:`,
                    option.nestedFields.map(nf => ({ id: nf.id, name: nf.name }))
                  )
                }
              })
            }
          })

          // Log the actual submission payload before sending
          const updateData = {
            organization_id: ORGANIZATION_ID,
            form_id: formId,
            reference_id: finalUserId, // Use user ID from URL, fallback to hardcoded
            submission_id: submissionId,
            values: transformedValues
          }
          console.log('Final update payload:', JSON.stringify(updateData, null, 2))
          console.log('=== END DEBUG ===')

          console.log('Form update data:', updateData)

          const response = await axios.post(`${API_BASE_URL}/api/submit/update?token=${token}`, updateData, {
            headers: {
              'Content-Type': 'application/json',
            }
          })

          const result = response.data
          console.log('Update successful:', result)
          toast.success("Form updated successfully!")

          // Extract edit count from response if available
          if (result.editCountLeft !== undefined) {
            setEditCountLeft(result.editCountLeft)
          }

          setUpdateSuccess(true)
        } else {
          // Create new submission
          const submissionData = {
            organization_id: ORGANIZATION_ID,
            reference_id: finalUserId,
            form_id: formId,
            values: transformedValues
          }

          console.log('Form submission data:', submissionData)

          const response = await axios.post(`${API_BASE_URL}/api/submit`, submissionData, {
            headers: {
              'Content-Type': 'application/json',
            }
          })

          const result = response.data
          console.log('Submission successful:', result)

          if (result.success && result.data) {
            const newSubmissionId = result.data?.submission_id
            console.log('Submission ID from data field:', newSubmissionId)

            const editToken = result.data?.edit_token

            console.log('Generated edit token:', editToken)

            if (newSubmissionId) {
              saveSubmissionToStorage(newSubmissionId, editToken)

              setLastSubmissionId(newSubmissionId)
              setLastSubmissionToken(editToken)
              setSubmissionSuccess(true)

              console.log('Edit token generated:', editToken)
              console.log('Submission ID:', newSubmissionId)
              console.log('Saved to localStorage:', {
                submissionId: newSubmissionId,
                editToken: editToken,
                formId: formId
              })

              toast.success("Thank you for your response!")
            } else {
              console.error("Response missing submission ID in data field", result);
              toast.error("Submission completed but edit feature unavailable")
            }
          } else {
            // Fallback to old format handling for backward compatibility
            const newSubmissionId = result?.data?.submission_id
            const editToken = result?.data?.edit_token
            console.log('Submission editToken:', editToken)

            if (newSubmissionId && editToken) {
              saveSubmissionToStorage(newSubmissionId, editToken)

              setLastSubmissionId(newSubmissionId)
              setLastSubmissionToken(editToken)
              setSubmissionSuccess(true)

              console.log('Edit token generated:', editToken)
              console.log('Submission ID:', newSubmissionId)
              console.log('Saved to localStorage:', {
                submissionId: newSubmissionId,
                editToken: editToken,
                formId: formId
              })

              toast.success("Thank you for your response!")
            } else {
              console.error("Response missing submission_id or edit_token", result);
              toast.error("Submission completed but edit feature unavailable")
            }
          }

        }

      } catch (error) {
        console.error('Error submitting form:', error)

        // Check for specific error messages
        if (error.response?.data?.error) {
          const errorMessage = error.response.data.error

          // Handle edit limit reached error
          if (errorMessage.includes("Edit limit reached") || errorMessage.includes("edit this form only")) {
            toast.error(errorMessage)
          } else {
            toast.error(errorMessage)
          }
        } else if (error.response?.status === 400) {
          // Handle 400 Bad Request with specific error message
          const errorMessage = error.response.data?.error || error.response.data?.message || "Invalid request"
          toast.error(errorMessage)
        } else if (error.response?.status === 403) {
          toast.error("Access denied. You don't have permission to perform this action.")
        } else if (error.response?.status === 404) {
          toast.error("Form or submission not found.")
        } else if (error.response?.status >= 500) {
          toast.error("Server error. Please try again later.")
        } else {
          toast.error("An error occurred while submitting the form.")
        }
      } finally {
        setSubmitting(false)
      }
    },
  })

  // Initialize form values based on mode
  useEffect(() => {
    if (formData && form && !formInitialized) {
      const initializeForm = async () => {
        if (isEditMode) {
          // Wait for submission data to be available
          if (submissionData) {
            const defaultValues = getDefaultValues()
            console.log('🔄 Initializing form with submission data:', defaultValues)
            await form.reset(defaultValues)
            setFormInitialized(true)
          }
        } else {
          // New form - initialize with empty values
          const defaultValues = getDefaultValues()
          console.log('🔄 Initializing new form with empty values:', defaultValues)
          await form.reset(defaultValues)
          setFormInitialized(true)
        }
      }

      initializeForm()
    }
  }, [formData, form, isEditMode, submissionData, formInitialized])

  // Reset formInitialized when mode changes
  useEffect(() => {
    setFormInitialized(false)
  }, [isEditMode, formId])

  // Add a debug effect to track form state changes
  useEffect(() => {
    console.log('Form State Update:', {
      isEditMode,
      formInitialized,
      submissionData: !!submissionData,
      formData: !!formData,
      formValues: form?.state?.values
    })
  }, [isEditMode, formInitialized, submissionData, formData, form?.state?.values])

  // Debug parsed form data structure
  useEffect(() => {
    if (formData) {
      formData.fields.forEach((field, index) => {
        console.log(`Field ${index}: ${field.label} (${field.type})`, {
          id: field.id,
          options: field.options,
          nestedFields: field.nestedFields,
          hasProcessedOptions: !!field._processedOptions,
          processedOptions: field._processedOptions
        })

        // Log nested structure
        if (field._processedOptions) {
          field._processedOptions.forEach((option, optIndex) => {
            if (option.nestedFields && option.nestedFields.length > 0) {
              console.log(`  Option ${optIndex}: "${option.value}" has ${option.nestedFields.length} nested fields`)
              option.nestedFields.forEach((nested, nestedIndex) => {
                console.log(`    Nested Field ${nestedIndex}: ${nested.label} (${nested.type})`)
              })
            }
          })
        }
      })
    }
  }, [formData])

  // Success View
  if (submissionSuccess && !isEditMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Building className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Slash CRM</h1>
                  <p className="text-sm text-muted-foreground">Form Collection</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                Submission Complete
              </Badge>
            </div>
          </div>
        </div>

        {/* Success Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg border-0">
              <CardHeader className="text-center pb-4 border-b bg-gradient-to-r from-green-50 to-emerald-100">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-green-700">
                  Thank You!
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Your response has been submitted successfully.
                </p>
              </CardHeader>

              <CardContent className="p-6 text-center">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">What would you like to do next?</h3>
                    <p className="text-sm text-muted-foreground">
                      You can edit your response if needed.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={handleEditResponse}
                      className="gap-2"
                      size="lg"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Response
                    </Button>
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Your information is secure and will only be used for the intended purpose.
                    We respect your privacy.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-blue-200 mt-12">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>Powered by Slash CRM • Secure Form Collection</p>
              <p className="mt-1">© 2025 Slash CRM. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading || (isEditMode && !formInitialized)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground">
              {isEditMode ? "Loading your submission..." : "Loading form..."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Form not found
  if (!formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The form you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/my-forms">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Form archived
  if (formData.archived) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
              <Pause className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Form Inactive</h2>
            <p className="text-muted-foreground mb-4">
              This form is currently inactive and cannot accept submissions. Please contact the form owner if you need to access it.
            </p>
            <Button asChild>
              <Link href="/my-forms">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Update Success View
  if (updateSuccess && isEditMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Building className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Slash CRM</h1>
                  <p className="text-sm text-muted-foreground">Form Collection</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                Update Complete
              </Badge>
            </div>
          </div>
        </div>

        {/* Success Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg border-0">
              <CardHeader className="text-center pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-100">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-blue-700">
                  Update Successful!
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Your form has been updated successfully.
                </p>
              </CardHeader>

              <CardContent className="p-6 text-center">
                <div className="space-y-6">
                  {/* Edit Count Display */}
                  {editCountLeft !== null && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Edit className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-blue-800">Edit Count</h3>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 mb-1">
                        {editCountLeft} {editCountLeft === 1 ? 'edit' : 'edits'} remaining
                      </p>
                      <p className="text-sm text-blue-600">
                        {editCountLeft === 0
                          ? "You have reached the maximum number of edits allowed."
                          : `You can edit your response ${editCountLeft} more ${editCountLeft === 1 ? 'time' : 'times'}.`
                        }
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">What would you like to do next?</h3>
                    <p className="text-sm text-muted-foreground">
                      {editCountLeft === 0
                        ? "You have reached the maximum number of edits. Your response is now final."
                        : "You can edit your response again if needed."
                      }
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {editCountLeft > 0 && (
                      <Button
                        onClick={() => {
                          setUpdateSuccess(false)
                          setIsEditMode(true)
                        }}
                        className="gap-2"
                        size="lg"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Again
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setUpdateSuccess(false)
                        setIsEditMode(true)
                      }}
                      variant="outline"
                      className="gap-2"
                      size="lg"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Response
                    </Button>
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Your information is secure and will only be used for the intended purpose.
                    We respect your privacy.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-blue-200 mt-12">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>Powered by Slash CRM • Secure Form Collection</p>
              <p className="mt-1">© 2025 Slash CRM. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Form View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
                <Image
                  src="/SlashLogo.png"
                  alt="SlashRtc Logo"
                  width={40}
                  height={40}
                  quality={75}
                  priority
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Slash CRM</h1>
                <p className="text-sm text-muted-foreground">Form Collection</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isEditMode ? "default" : "outline"} className="text-xs">
                {isEditMode ? "Edit Mode" : "Public Form"}
              </Badge>
              {isEditMode && (
                <Badge variant="secondary" className="text-xs">
                  ID: {submissionId?.substring(0, 8)}...
                </Badge>
              )}
              {isEditMode && editCountLeft !== null && (
                <Badge
                  variant={editCountLeft === 0 ? "destructive" : editCountLeft <= 2 ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {editCountLeft === 0
                    ? "No edits left"
                    : `${editCountLeft} edit${editCountLeft === 1 ? '' : 's'} left`
                  }
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-primary" />
                {formData.form_name}
                {isEditMode && (
                  <Badge variant={isEditable ? "secondary" : "destructive"} className="ml-2">
                    {isEditable ? "Editing" : "View Only"}
                  </Badge>
                )}
              </CardTitle>
              {formData.description && (
                <p className="text-muted-foreground mt-2">{formData.description}</p>
              )}
              {isEditMode && (
                <div className="mt-2 space-y-1">
                  {isEditable ? (
                    <p className="text-sm text-blue-600">
                      You are editing an existing submission. Make your changes and click &quot;Update Form&quot; to save.
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600">
                      This submission is no longer editable. You can view the data but cannot make changes.
                    </p>
                  )}
                  {formData.version && (
                    <p className="text-xs text-gray-500">
                      Editing submission from Form v{formData.version}
                      {formData.archived && <span className="text-yellow-600 ml-1">(Original version)</span>}
                    </p>
                  )}
                </div>
              )}
              {!isEditMode && formData.version && (
                <p className="text-xs text-gray-500 mt-1">
                  Form v{formData.version} {isVersionReadOnly ? '(View Only - older version)' : '(Latest)'}
                </p>
              )}
            </CardHeader>

            <CardContent className="p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
                className="space-y-6"
              >
                {formData.fields.map((field, index) => {
                  const fieldKey = field.id || generateUniqueFieldId()

                  // Process the field to ensure options and nested fields are properly structured
                  const processedField = {
                    ...field,
                    options: processFieldOptions(field)
                  }

                  return (
                    <form.Field
                      key={fieldKey}
                      name={field.id}
                      validators={{
                        onChange: ({ value }) => {
                          const errors = validateField(field, value)
                          return errors.length > 0 ? errors[0] : undefined
                        },
                        onSubmit: ({ value }) => {
                          const errors = validateField(field, value)
                          return errors.length > 0 ? errors[0] : undefined
                        },
                      }}
                    >
                      {(fieldApi) => {

                        return (
                          <div className="space-y-2">
                            <FieldRenderer
                              field={processedField}
                              value={fieldApi.state.value}
                              onChange={fieldApi.handleChange}
                              invalid={fieldApi.state.meta.errors.length > 0}
                              error={fieldApi.state.meta.errors.length > 0 ? fieldApi.state.meta.errors[0] : undefined}
                              hideFieldTypes={true}
                            />
                          </div>
                        )
                      }}
                    </form.Field>
                  )
                })}

                <Separator className="my-6" />

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    {formData.fields.length} {formData.fields.length === 1 ? "field" : "fields"} •{" "}
                    {formData.fields.filter((f) => f.required).length} required
                    {isEditMode && " • Editing existing submission"}
                    {isEditMode && editCountLeft !== null && (
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${editCountLeft === 0
                        ? "bg-red-100 text-red-700"
                        : editCountLeft <= 2
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                        }`}>
                        {editCountLeft === 0
                          ? "⚠️ No edits remaining"
                          : `✏️ ${editCountLeft} edit${editCountLeft === 1 ? '' : 's'} remaining`
                        }
                      </span>
                    )}
                  </div>

                  <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        type="submit"
                        disabled={!canSubmit || submitting || (isEditMode && !isEditable) || (!isEditMode && isVersionReadOnly)}
                        className="gap-2 min-w-32"
                      >
                        {submitting || isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            {isEditMode ? "Updating..." : "Submitting..."}
                          </>
                        ) : (
                          <>
                            {isEditMode && isEditable ? (
                              <>
                                <Save className="h-4 w-4" />
                                Update Form
                              </>
                            ) : !isEditMode ? (
                              <>
                                {isVersionReadOnly ? (
                                  <>
                                    <Lock className="h-4 w-4" />
                                    View Only
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-4 w-4" />
                                    Submit Form
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4" />
                                Form Not Editable
                              </>
                            )}
                          </>
                        )}
                      </Button>
                    )}
                  </form.Subscribe>
                </div>
              </form>

              {/* Privacy Notice */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  Your information is secure and will only be used for the intended purpose.
                  We respect your privacy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-blue-200 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Powered by Slash CRM • Secure Form Collection</p>
            <p className="mt-1">© 2025 Slash CRM. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}