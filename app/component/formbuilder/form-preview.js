"use client"

import { useForm } from "@tanstack/react-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle2, Send, Copy, ExternalLink, Settings } from "lucide-react"
import { FieldRenderer } from "./field-renderer"
import { useState } from "react"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useEffect } from "react"

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
        // If the option already has nestedFields, use them
        if (option.nestedFields) {
          return {
            value: option.value,
            label: option.label,
            nestedFields: option.nestedFields || []
          }
        }

        // If the option doesn't have nestedFields but the field has nestedFields for this index,
        // convert the form builder structure to the expected structure
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

// Helper function to recursively process nested fields structure
const processNestedFieldsRecursively = (nestedFields) => {
  if (!Array.isArray(nestedFields)) return []

  return nestedFields.map(nestedField => {
    // Process validation object properly for nested fields
    let validation = {}
    if (nestedField.validation) {
      if (typeof nestedField.validation === 'string') {
        try {
          validation = JSON.parse(nestedField.validation)
        } catch (e) {
          console.warn('Failed to parse nested field validation as JSON:', nestedField.validation)
          validation = {}
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

    const processedField = {
      id: nestedField.id,
      name: nestedField.name,
      type: nestedField.type,
      label: nestedField.label,
      placeholder: nestedField.placeholder || '',
      required: nestedField.required || false,
      validation: validation,
      options: processFieldOptions(nestedField) // Process options recursively
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

// API configuration
const API_BASE_URL = 'http://10.10.15.194:3001'
const ORGANIZATION_ID = 'c8c72c21-7b5c-435a-912a-803105e7ecc9'
const TABLE_ID = '040e899d-583a-454e-92e6-d0d5a8095587'
const USER_ID = 'c2a985ce-d385-4349-8f0c-d46e63027ce4'

// Generate or use a proper token
const getAuthToken = () => {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzU5MzE0ODY2LCJleHAiOjE3NTk0MDEyNjZ9.QjKz8fTFwia76o7LkkdmlGGhEKoguy8o6iFbCojMwkE'
}

const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYwNTA2OTYzLCJleHAiOjE3NjA1OTMzNjN9.SEAwwoCusaotsc_lhb3nh0Fq5tIOWIHtbMYCG1vZ2jU'

export function FormPreview({ fields, isEditMode = false, formData = null }) {
  const [generatedLink, setGeneratedLink] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [retryCount, setRetryCount] = useState("2")

  // Populate form metadata when in edit mode
  useEffect(() => {
    if (isEditMode && formData) {
      setFormName(formData.formName || "")
      setFormDescription(formData.description || "")
      setRetryCount(formData.max_retry_count?.toString() || "2")
    }
  }, [isEditMode, formData])

  // Filter out table_column type fields from preview
  const previewFields = fields.filter(field => field.type !== "table_column")

  // Separate table columns from regular form fields
  const tableColumnFields = previewFields.filter(field => field.source === 'table')
  const regularFormFields = previewFields.filter(field => field.source !== 'table')

  // Ensure unique field IDs for form default values
  const getDefaultValues = () => {
    return previewFields.reduce((acc, field) => {
      const fieldKey = field.id

      if (["select", "checkbox", "radio"].includes(field.type)) {
        if (field.type === "checkbox" || (field.type === "select" && field.validation?.multiple)) {
          acc[fieldKey] = {
            value: [],
            nestedFields: {}
          }
        } else {
          acc[fieldKey] = {
            value: "",
            nestedFields: {}
          }
        }
      } else if (field.type === "file") {
        acc[fieldKey] = null
      } else if (field.type === "location" || field.type === "phone") {
        acc[fieldKey] = {}
      } else {
        acc[fieldKey] = ""
      }

      return acc
    }, {})
  }

  const form = useForm({
    defaultValues: getDefaultValues(),
    onSubmit: async ({ value }) => {
      console.log("Form submitted:", value)
      toast.success("Form submitted successfully")
    },
  })

  // Update the handleGenerateLink function in form-preview.js
  // const handleGenerateLink = async () => {
  //   if (!formName.trim()) {
  //     toast.error("Please enter a form name")
  //     return
  //   }

  //   if (fields.length === 0) {
  //     toast.error("Please add at least one field to the form")
  //     return
  //   }

  //   if (previewFields.length === 0) {
  //     toast.error("Please add at least one field to the form")
  //     return
  //   }

  //   setIsGenerating(true)
  //   try {
  //     // API configuration
  //     const API_BASE_URL = 'http://10.10.15.194:3001'
  //     const ORGANIZATION_ID = 'c8c72c21-7b5c-435a-912a-803105e7ecc9'
  //     const TABLE_ID = '040e899d-583a-454e-92e6-d0d5a8095587'
  //     const USER_ID = 'c2a985ce-d385-4349-8f0c-d46e63027ce4'
  //     const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYwNDM2MjAyLCJleHAiOjE3NjA1MjI2MDJ9.rXbGaZSpO0G6tMp-OiTTERW7D0pCXi5OutXH-8exGnw'

  //     // Get existing table columns to avoid duplicates
  //     let existingColumns = []
  //     try {
  //       const response = await axios.get(`${API_BASE_URL}/api/datatables/${TABLE_ID}/columns`, {
  //         headers: {
  //           'Authorization': `Bearer ${AUTH_TOKEN}`,
  //           'Content-Type': 'application/json',
  //         },
  //       })
  //       existingColumns = Array.isArray(response.data) ? response.data : []
  //       console.log('📊 Existing table columns:', existingColumns.map(col => col.column_name))
  //     } catch (error) {
  //       console.log('⚠️ Could not fetch existing columns, continuing anyway...')
  //       console.error('Error details:', error)
  //     }

  //     // Prepare table column fields (from table columns) - ALLOW ALL FIELDS
  //     const tableFields = tableColumnFields
  //       .map(field => {
  //         // Convert options to the new nested structure for table fields
  //         let optionsArray = []
  //         if (field.options && Array.isArray(field.options)) {
  //           // Create options array with nested fields structure
  //           optionsArray = field.options.map((option, index) => {
  //             const optionObj = {
  //               value: option,
  //               label: option,
  //               nestedFields: []
  //             }

  //             // Add nested fields for this option if they exist
  //             if (field.nestedFields && field.nestedFields[index]) {
  //               optionObj.nestedFields = field.nestedFields[index].map(nestedField => {
  //                 const processedNestedField = {
  //                   id: nestedField.id,
  //                   name: nestedField.label.toLowerCase().replace(/\s+/g, '_'),
  //                   label: nestedField.label,
  //                   type: nestedField.type,
  //                   required: nestedField.required || false,
  //                   validations: nestedField.validation || {},
  //                   hasNested: false,
  //                   options: []
  //                 }

  //                 // Process nested field options if it's a select, checkbox, or radio
  //                 if (["select", "checkbox", "radio"].includes(nestedField.type) && nestedField.options) {
  //                   processedNestedField.options = nestedField.options.map((nestedOption, nestedOptionIndex) => {
  //                     const nestedOptionObj = {
  //                       value: nestedOption,
  //                       label: nestedOption,
  //                       nestedFields: []
  //                     }

  //                     // Recursively process nested fields within nested fields
  //                     if (nestedField.nestedFields && nestedField.nestedFields[nestedOptionIndex]) {
  //                       nestedOptionObj.nestedFields = nestedField.nestedFields[nestedOptionIndex].map(deepNestedField => ({
  //                         id: deepNestedField.id,
  //                         name: deepNestedField.label.toLowerCase().replace(/\s+/g, '_'),
  //                         label: deepNestedField.label,
  //                         type: deepNestedField.type,
  //                         required: deepNestedField.required || false,
  //                         validations: deepNestedField.validation || {},
  //                         hasNested: false,
  //                         options: deepNestedField.options || []
  //                       }))
  //                     }

  //                     return nestedOptionObj
  //                   })

  //                   // Check if this nested field has nested fields
  //                   processedNestedField.hasNested = processedNestedField.options.some(option => option.nestedFields.length > 0)
  //                 }

  //                 return processedNestedField
  //               })
  //             }

  //             return optionObj
  //           })
  //         }

  //         // Determine if field has nested fields
  //         const hasNestedFields = optionsArray.some(option => option.nestedFields.length > 0)

  //         const fieldObj = {
  //           id: field.tableColumnId || field.id,
  //           name: field.tableColumnName || field.label.toLowerCase().replace(/\s+/g, '_'),
  //           label: field.label,
  //           type: field.type,
  //           required: field.required || false,
  //           validations: field.validation || {},
  //           hasNested: hasNestedFields,
  //           options: optionsArray
  //         }
  //         console.log('📊 Table Field (New Structure):', fieldObj)
  //         console.log('🔍 Nested Fields for table field:', field.label, field.nestedFields)
  //         return fieldObj
  //       })

  //     // Prepare extra fields (regular form fields) - ALLOW ALL FIELDS
  //     const extraFields = regularFormFields
  //       .map(field => {
  //         // Convert options to the new nested structure
  //         let optionsArray = []
  //         if (field.options && Array.isArray(field.options)) {
  //           // Create options array with nested fields structure
  //           optionsArray = field.options.map((option, index) => {
  //             const optionObj = {
  //               value: option,
  //               label: option,
  //               nestedFields: []
  //             }

  //             // Add nested fields for this option if they exist
  //             if (field.nestedFields && field.nestedFields[index]) {
  //               optionObj.nestedFields = field.nestedFields[index].map(nestedField => {
  //                 const processedNestedField = {
  //                   id: nestedField.id,
  //                   name: nestedField.label.toLowerCase().replace(/\s+/g, '_'),
  //                   label: nestedField.label,
  //                   type: nestedField.type,
  //                   required: nestedField.required || false,
  //                   validations: nestedField.validation || {},
  //                   hasNested: false,
  //                   options: []
  //                 }

  //                 // Process nested field options if it's a select, checkbox, or radio
  //                 if (["select", "checkbox", "radio"].includes(nestedField.type) && nestedField.options) {
  //                   processedNestedField.options = nestedField.options.map((nestedOption, nestedOptionIndex) => {
  //                     const nestedOptionObj = {
  //                       value: nestedOption,
  //                       label: nestedOption,
  //                       nestedFields: []
  //                     }

  //                     // Recursively process nested fields within nested fields
  //                     if (nestedField.nestedFields && nestedField.nestedFields[nestedOptionIndex]) {
  //                       nestedOptionObj.nestedFields = nestedField.nestedFields[nestedOptionIndex].map(deepNestedField => ({
  //                         id: deepNestedField.id,
  //                         name: deepNestedField.label.toLowerCase().replace(/\s+/g, '_'),
  //                         label: deepNestedField.label,
  //                         type: deepNestedField.type,
  //                         required: deepNestedField.required || false,
  //                         validations: deepNestedField.validation || {},
  //                         hasNested: false,
  //                         options: deepNestedField.options || []
  //                       }))
  //                     }

  //                     return nestedOptionObj
  //                   })

  //                   // Check if this nested field has nested fields
  //                   processedNestedField.hasNested = processedNestedField.options.some(option => option.nestedFields.length > 0)
  //                 }

  //                 return processedNestedField
  //               })
  //             }

  //             return optionObj
  //           })
  //         }

  //         // Determine if field has nested fields
  //         const hasNestedFields = optionsArray.some(option => option.nestedFields.length > 0)

  //         const fieldObj = {
  //           id: field.id,
  //           name: field.label.toLowerCase().replace(/\s+/g, '_'),
  //           label: field.label,
  //           type: field.type,
  //           required: field.required || false,
  //           validations: field.validation || {},
  //           hasNested: hasNestedFields,
  //           options: optionsArray
  //         }

  //         console.log('📝 Extra Field (New Structure):', fieldObj)
  //         console.log('🔍 Nested Fields for field:', field.label, field.nestedFields)
  //         return fieldObj
  //       })

  //     // Check if we have any fields to send after filtering duplicates
  //     if (tableFields.length === 0 && extraFields.length === 0) {
  //       toast.error("All fields already exist in the table. No new fields to add.")
  //       setIsGenerating(false)
  //       return
  //     }

  //     // Prepare the form data for API
  //     const formData = {
  //       organization_id: ORGANIZATION_ID,
  //       table_id: TABLE_ID,
  //       form_name: formName,
  //       description: formDescription,
  //       created_by: USER_ID,
  //       fields: [...tableFields, ...extraFields].map(field => {
  //         const processedField = {
  //           ...field,
  //           options: Array.isArray(field.options) ? field.options : [],
  //           validation: typeof field.validations === 'object' ? field.validations : {},
  //           required: field.required ? "true" : "false",
  //         }

  //         console.log(`Processed field ${field.name}:`, {
  //           name: processedField.name,
  //           type: processedField.type,
  //           hasNested: processedField.hasNested,
  //           options: processedField.options,
  //           optionsType: typeof processedField.options
  //         })

  //         return processedField
  //       }),
  //       published: true
  //     }

  //     console.log('🚀 Sending form data to API:', formData)
  //     console.log('🔍 Detailed nested fields analysis:')
  //     formData.fields.forEach((field, index) => {
  //       console.log(`Field ${index + 1}: ${field.name}`)
  //       console.log(`  - Options:`, field.options)
  //       console.log(`  - Has nested fields:`, field.hasNested)
  //       if (field.hasNested) {
  //         field.options.forEach((option, optIndex) => {
  //           if (option.nestedFields.length > 0) {
  //             console.log(`    Option ${optIndex} (${option.value}):`, option.nestedFields)
  //           }
  //         })
  //       }
  //     })

  //     // Use only the correct endpoint
  //     const endpoint = `${API_BASE_URL}/api/forms`
  //     console.log(`🔄 Using endpoint: ${endpoint}`)

  //     try {
  //       const response = await axios.post(`${API_BASE_URL}/api/forms`, formData, {
  //         headers: {
  //           'Authorization': `Bearer ${AUTH_TOKEN}`,
  //           'Content-Type': 'application/json',
  //         },
  //       })
  //       const result = response.data
  //       console.log('✅ API Success Response:', result)

  //     if (result.success && result.form) {
  //       // Generate the public URL using the form_id from API response
  //       const publicUrl = `${window.location.origin}/forms/${result.form.form_id}`
  //       setGeneratedLink(publicUrl)

  //       // Store form data locally for the form view page
  //       const completeFormData = {
  //         form_name: formName,
  //         description: formDescription,
  //         // Store all preview fields with their complete data including options
  //         previewFields: previewFields.map(field => ({
  //           id: field.id,
  //           type: field.type,
  //           label: field.label,
  //           placeholder: field.placeholder,
  //           required: field.required,
  //           options: field.options, // Include options array directly for local storage
  //           validation: field.validation,
  //           source: field.source,
  //           tableColumnId: field.tableColumnId,
  //           tableColumnName: field.tableColumnName
  //         })),
  //         tableFields: tableFields,
  //         extraFields: extraFields,
  //         generatedAt: new Date().toISOString()
  //       }

  //       localStorage.setItem(`form-${result.form.form_id}`, JSON.stringify(completeFormData))
  //       toast.success("Form link generated successfully!")
  //       return result
  //     } else {
  //       throw new Error('Invalid response from server: ' + JSON.stringify(result))
  //     }

  //   } catch (error) {
  //     console.error('❌ Form creation failed:', error)

  //     // Handle specific error cases
  //     if (error.response?.status === 409) {
  //       throw new Error(`Field already exists: ${error.response.data?.error || 'Unknown error'}`)
  //     } else if (error.response?.status === 500) {
  //       throw new Error(`Invalid data format: ${error.response.data?.error || 'Unknown error'}`)
  //     } else {
  //       throw new Error(error.message || 'Failed to create form')
  //     }
  //   }

  //   } finally {
  //     setIsGenerating(false)
  //   }
  // }

  // Update the handleGenerateLink function in form-preview.js
  const handleGenerateLink = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a form name")
      return
    }

    if (fields.length === 0) {
      toast.error("Please add at least one field to the form")
      return
    }

    if (previewFields.length === 0) {
      toast.error("Please add at least one field to the form")
      return
    }

    setIsGenerating(true)
    try {

      // Recursive function to process nested fields
      const processNestedFields = (nestedFields, parentIndex = null) => {
        if (!nestedFields || !Array.isArray(nestedFields)) return []

        return nestedFields.map((nestedField, nestedIndex) => {
          const nestedFieldId = parentIndex !== null ?
            `${parentIndex}_${nestedIndex}` :
            `${nestedIndex}`

          // Process options for this nested field if it has them
          let nestedOptions = []
          if (nestedField.options && Array.isArray(nestedField.options)) {
            nestedOptions = nestedField.options.map((nestedOption, nestedOptionIndex) => {
              const nestedOptionObj = {
                value: typeof nestedOption === 'string' ? nestedOption : nestedOption.value,
                label: typeof nestedOption === 'string' ? nestedOption : nestedOption.label,
                nestedFields: []
              }

              // Recursively process nested fields within nested options
              if (nestedField.nestedFields && nestedField.nestedFields[nestedOptionIndex]) {
                nestedOptionObj.nestedFields = processNestedFields(
                  nestedField.nestedFields[nestedOptionIndex],
                  nestedOptionIndex
                )
              }

              return nestedOptionObj
            })
          }

          const processedNestedField = {
            id: nestedField.id,
            name: nestedField.label.toLowerCase().replace(/\s+/g, '_'),
            label: nestedField.label,
            type: nestedField.type,
            required: nestedField.required || false,
            validations: nestedField.validation || {},
            hasNested: false,
            options: nestedOptions,
            isLeadColumn: nestedField.isLeadColumn || false
          }

          // Check if this nested field has nested fields
          processedNestedField.hasNested = processedNestedField.options.some(
            option => option.nestedFields && option.nestedFields.length > 0
          )

          return processedNestedField
        })
      }

      // Prepare table column fields
      const tableFields = tableColumnFields.map(field => {
        let optionsArray = []

        if (field.options && Array.isArray(field.options)) {
          optionsArray = field.options.map((option, index) => {
            const optionObj = {
              value: typeof option === 'string' ? option : option.value,
              label: typeof option === 'string' ? option : option.label,
              nestedFields: []
            }

            // Process nested fields for this option
            if (field.nestedFields && field.nestedFields[index]) {
              optionObj.nestedFields = processNestedFields(field.nestedFields[index], index)
            }

            return optionObj
          })
        }

        const hasNestedFields = optionsArray.some(option =>
          option.nestedFields && option.nestedFields.length > 0
        )

        const fieldObj = {
          id: field.tableColumnId || field.id,
          name: field.tableColumnName || field.label.toLowerCase().replace(/\s+/g, '_'),
          label: field.label,
          type: field.type,
          required: field.required || false,
          validations: field.validation || {},
          hasNested: hasNestedFields,
          options: optionsArray,
          isLeadColumn: field.isLeadColumn || false
        }

        console.log('📊 Table Field:', {
          name: fieldObj.name,
          type: fieldObj.type,
          hasNested: fieldObj.hasNested,
          optionsCount: fieldObj.options.length,
          nestedLevels: fieldObj.options.map(opt => ({
            value: opt.value,
            nestedFieldsCount: opt.nestedFields.length
          }))
        })

        return fieldObj
      })

      // Prepare extra fields (regular form fields)
      const extraFields = regularFormFields.map(field => {
        let optionsArray = []

        if (field.options && Array.isArray(field.options)) {
          optionsArray = field.options.map((option, index) => {
            const optionObj = {
              value: typeof option === 'string' ? option : option.value,
              label: typeof option === 'string' ? option : option.label,
              nestedFields: []
            }

            // Process nested fields for this option
            if (field.nestedFields && field.nestedFields[index]) {
              optionObj.nestedFields = processNestedFields(field.nestedFields[index], index)
            }

            return optionObj
          })
        }

        const hasNestedFields = optionsArray.some(option =>
          option.nestedFields && option.nestedFields.length > 0
        )

        const fieldObj = {
          id: field.id,
          name: field.label.toLowerCase().replace(/\s+/g, '_'),
          label: field.label,
          type: field.type,
          required: field.required || false,
          validations: field.validation || {},
          hasNested: hasNestedFields,
          options: optionsArray,
          isLeadColumn: field.isLeadColumn || false
        }

        console.log('📝 Extra Field:', {
          name: fieldObj.name,
          type: fieldObj.type,
          hasNested: fieldObj.hasNested,
          optionsCount: fieldObj.options.length,
          nestedLevels: fieldObj.options.map(opt => ({
            value: opt.value,
            nestedFieldsCount: opt.nestedFields.length
          }))
        })

        return fieldObj
      })

      // Check if we have any fields to send
      if (tableFields.length === 0 && extraFields.length === 0) {
        toast.error("No valid fields to add to the form")
        setIsGenerating(false)
        return
      }

      // Separate fields based on isLeadColumn setting
      const allFields = [...tableFields, ...extraFields]
      const regularFields = allFields.filter(field => !field.isLeadColumn)
      const leadDatabaseFields = allFields.filter(field => field.isLeadColumn)

      // Helper function to process field data
      const processFieldData = (field) => {
        // Ensure options is always an array
        const processedOptions = Array.isArray(field.options) ? field.options : []

        const processedField = {
          id: field.id,
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required ? "true" : "false",
          validations: field.validations || {},
          hasNested: field.hasNested || false,
          isLeadColumn: field.isLeadColumn ? "true" : "false",
          options: processedOptions.map(option => ({
            value: option.value,
            label: option.label,
            nestedFields: option.nestedFields || []
          }))
        }

        console.log(`✅ Processed field ${field.name}:`, {
          name: processedField.name,
          type: processedField.type,
          hasNested: processedField.hasNested,
          isLeadColumn: processedField.isLeadColumn,
          options: processedField.options.map(opt => ({
            value: opt.value,
            nestedFieldsCount: opt.nestedFields.length,
            nestedFields: opt.nestedFields.map(nf => ({
              name: nf.name,
              type: nf.type,
              hasNested: nf.hasNested
            }))
          }))
        })

        return processedField
      }

      // Prepare the form data for API
      const formData = {
        organization_id: ORGANIZATION_ID,
        table_id: TABLE_ID,
        form_name: formName,
        description: formDescription,
        created_by: USER_ID,
        fields: regularFields.map(processFieldData),
        extraFields: leadDatabaseFields.map(processFieldData),
        published: true,
        retry_count: retryCount
      }

      console.log('🚀 Final API Payload:', JSON.stringify(formData, null, 2))

      // Debug nested structure
      console.log('🔍 Detailed nested structure analysis:')
      console.log(`📊 Regular Fields (${formData.fields.length}):`)
      formData.fields.forEach((field, fieldIndex) => {
        console.log(`Field ${fieldIndex + 1}: ${field.name} (${field.type}) - isLeadColumn: ${field.isLeadColumn}`)
        field.options.forEach((option, optIndex) => {
          if (option.nestedFields.length > 0) {
            console.log(`  Option ${optIndex}: "${option.value}"`)
            option.nestedFields.forEach((nestedField, nestedIndex) => {
              console.log(`    Nested Field ${nestedIndex}: ${nestedField.name} (${nestedField.type})`)
              if (nestedField.options && nestedField.options.length > 0) {
                nestedField.options.forEach((nestedOption, nestedOptIndex) => {
                  if (nestedOption.nestedFields.length > 0) {
                    console.log(`      Nested Option ${nestedOptIndex}: "${nestedOption.value}"`)
                    nestedOption.nestedFields.forEach((deepNested, deepIndex) => {
                      console.log(`        Deep Nested ${deepIndex}: ${deepNested.name} (${deepNested.type})`)
                    })
                  }
                })
              }
            })
          }
        })
      })

      console.log(`📊 Lead Database Fields (${formData.extraFields.length}):`)
      formData.extraFields.forEach((field, fieldIndex) => {
        console.log(`Extra Field ${fieldIndex + 1}: ${field.name} (${field.type}) - isLeadColumn: ${field.isLeadColumn}`)
        field.options.forEach((option, optIndex) => {
          if (option.nestedFields.length > 0) {
            console.log(`  Option ${optIndex}: "${option.value}"`)
            option.nestedFields.forEach((nestedField, nestedIndex) => {
              console.log(`    Nested Field ${nestedIndex}: ${nestedField.name} (${nestedField.type})`)
              if (nestedField.options && nestedField.options.length > 0) {
                nestedField.options.forEach((nestedOption, nestedOptIndex) => {
                  if (nestedOption.nestedFields.length > 0) {
                    console.log(`      Nested Option ${nestedOptIndex}: "${nestedOption.value}"`)
                    nestedOption.nestedFields.forEach((deepNested, deepIndex) => {
                      console.log(`        Deep Nested ${deepIndex}: ${deepNested.name} (${deepNested.type})`)
                    })
                  }
                })
              }
            })
          }
        })
      })

      // Use only the correct endpoint
      const endpoint = `${API_BASE_URL}/api/forms`
      console.log(`🔄 Using endpoint: ${endpoint}`)

      try {
        const response = await axios.post(endpoint, formData, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })

        const result = response.data
        console.log('✅ API Success Response:', result)

        if (result.success && result.form) {
          // Generate the public URL using the form_id from API response with user ID parameter
          const publicUrl = `${window.location.origin}/forms/${result.form.form_id}?user_id=${USER_ID}`
          setGeneratedLink(publicUrl)

          // Store form data locally for the form view page
          const completeFormData = {
            form_name: formName,
            description: formDescription,
            retry_count: retryCount,
            previewFields: previewFields.map(field => ({
              id: field.id,
              type: field.type,
              label: field.label,
              placeholder: field.placeholder,
              required: field.required,
              options: field.options,
              validation: field.validation,
              source: field.source,
              tableColumnId: field.tableColumnId,
              tableColumnName: field.tableColumnName,
              nestedFields: field.nestedFields
            })),
            tableFields: tableFields,
            extraFields: extraFields,
            generatedAt: new Date().toISOString()
          }

          localStorage.setItem(`form-${result.form.form_id}`, JSON.stringify(completeFormData))
          toast.success("Form link generated successfully!")
          return result
        } else {
          throw new Error('Invalid response from server: ' + JSON.stringify(result))
        }

      } catch (error) {
        console.error('❌ Form creation failed:', error)

        // Handle specific error cases
        if (error.response?.status === 409) {
          throw new Error(`Field already exists: ${error.response.data?.error || 'Unknown error'}`)
        } else if (error.response?.status === 500) {
          throw new Error(`Invalid data format: ${error.response.data?.error || 'Unknown error'}`)
        } else {
          throw new Error(error.message || 'Failed to create form')
        }
      }

    } catch (error) {
      console.error('❌ Form generation error:', error)
      toast.error(error.message || 'Failed to generate form link')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openFormInNewTab = () => {
    if (generatedLink) {
      window.open(generatedLink, '_blank', 'noopener,noreferrer')
      toast.info("Opening form in new tab")
    }
  }

  const PHONE_COUNTRIES = {
    US: { dial: "+1", len: 10 },
    IN: { dial: "+91", len: 10 },
    GB: { dial: "+44", len: 10 },
    CA: { dial: "+1", len: 10 },
    AU: { dial: "+61", len: 9 },
  }

  const validateNestedField = (nestedField, value) => {
    const errors = []

    // Required validation
    const isRequired = nestedField.required || nestedField.validation?.required
    if (isRequired) {
      if (nestedField.type === "select") {
        if (!value || value === "") {
          errors.push("Please select an option")
        }
      } else if (nestedField.type === "checkbox") {
        if (!Array.isArray(value) || value.length === 0) {
          errors.push("Please select at least one option")
        }
      } else if (nestedField.type === "file") {
        if (!value) {
          errors.push("Please select a file")
        }
      } else if (!value || (typeof value === "string" && value.trim() === "")) {
        errors.push("This field is required")
      }
    }

    // File type validation
    if (nestedField.type === "file" && value && nestedField.validation?.accept) {
      const acceptedTypes = nestedField.validation.accept.split(",").map((type) => type.trim())
      const fileName = value.name || ""
      const fileType = value.type || ""

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
        errors.push(`File type not allowed. Accepted types: ${nestedField.validation.accept}`)
      }
    }

    // File size validation
    if (nestedField.type === "file" && value && nestedField.validation?.maxSize) {
      const maxSizeBytes = nestedField.validation.maxSize * 1024 * 1024
      if (value.size > maxSizeBytes) {
        errors.push(`File size must be less than ${nestedField.validation.maxSize}MB`)
      }
    }

    // Type-specific validation
    if (value && typeof value === "string" && value.trim() !== "") {
      switch (nestedField.type) {
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
            if (nestedField.validation?.min !== undefined && numValue < nestedField.validation.min) {
              errors.push(`Value must be at least ${nestedField.validation.min}`)
            }
            if (nestedField.validation?.max !== undefined && numValue > nestedField.validation.max) {
              errors.push(`Value must be at most ${nestedField.validation.max}`)
            }
          }
          break

        case "text":
        case "textarea":
          if (nestedField.validation?.pattern && nestedField.validation.pattern.trim() !== "") {
            try {
              const pattern = nestedField.validation.pattern.trim()
              if (pattern) {
                const regex = new RegExp(pattern)
                if (!regex.test(value)) {
                  errors.push("Value does not match the required pattern")
                }
              }
            } catch (e) {
              console.warn("Invalid regex pattern:", nestedField.validation.pattern, e.message)
            }
          }
          if (nestedField.validation?.minLength && value.length < nestedField.validation.minLength) {
            errors.push(`Value must be at least ${nestedField.validation.minLength} characters`)
          }
          if (nestedField.validation?.maxLength && value.length > nestedField.validation.maxLength) {
            errors.push(`Value must be at most ${nestedField.validation.maxLength} characters`)
          }
          break

        case "phone":
          const digits = value.replace(/\D/g, "")
          if (nestedField.validation?.minLength && digits.length < nestedField.validation.minLength) {
            errors.push(`Phone number must be at least ${nestedField.validation.minLength} digits`)
          }
          if (nestedField.validation?.maxLength && digits.length > nestedField.validation.maxLength) {
            errors.push(`Phone number must be at most ${nestedField.validation.maxLength} digits`)
          }
          break
      }
    }

    return errors
  }

  const validateField = (field, value) => {
    const errors = []

    // Required validation - check both field.required and validation.required
    const isRequired = field.required || field.validation?.required
    if (isRequired) {
      if (field.type === "select") {
        if (field.validation?.multiple) {
          // Multiple select - should be array with at least one item
          if (!Array.isArray(value) || value.length === 0) {
            errors.push("Please select at least one option")
          }
        } else {
          // Single select - should have a value
          if (!value || value === "") {
            errors.push("Please select an option")
          }
        }
      } else if (field.type === "checkbox") {
        // Checkbox group - should have at least one selected
        if (!Array.isArray(value) || value.length === 0) {
          errors.push("Please select at least one option")
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

    // File type validation
    if (field.type === "file" && value && field.validation?.accept) {
      const acceptedTypes = field.validation.accept.split(",").map((type) => type.trim())
      const fileName = value.name || ""
      const fileType = value.type || ""

      const isAccepted = acceptedTypes.some((acceptType) => {
        if (acceptType.startsWith(".")) {
          // File extension check
          return fileName.toLowerCase().endsWith(acceptType.toLowerCase())
        } else if (acceptType.includes("*")) {
          // MIME type wildcard check (e.g., image/*)
          const baseType = acceptType.split("/")[0]
          return fileType.startsWith(baseType + "/")
        } else {
          // Exact MIME type check
          return fileType === acceptType
        }
      })

      if (!isAccepted) {
        errors.push(`File type not allowed. Accepted types: ${field.validation.accept}`)
      }
    }

    // Type-specific validation
    if (value && ((typeof value === "string" && value.trim() !== "") || field.type === "phone")) {
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

        case "text":
        case "textarea":
          if (field.validation?.pattern && field.validation.pattern.trim() !== "") {
            try {
              const pattern = field.validation.pattern.trim()
              if (pattern) {
                const regex = new RegExp(pattern)
                if (!regex.test(value)) {
                  errors.push("Value does not match the required pattern")
                }
              }
            } catch (e) {
              console.warn("Invalid regex pattern:", field.validation.pattern, e.message)
              // Don't add validation error for invalid regex, just warn
            }
          }
          break

        case "phone": {
          const v = value || {}
          const meta = PHONE_COUNTRIES[v.country || "US"]
          const digits = String(v.number || "").replace(/\D/g, "")
          const minLen =
            typeof field.validation?.minLength === "number" ? field.validation.minLength : (meta?.len ?? 10)
          const maxLen =
            typeof field.validation?.maxLength === "number" ? field.validation.maxLength : (meta?.len ?? 10)
          if (digits.length < minLen || digits.length > maxLen) {
            if (minLen === maxLen) {
              errors.push(`Phone number must be ${minLen} digits for ${v.country || "selected country"}`)
            } else {
              errors.push(`Phone number must be ${minLen}-${maxLen} digits`)
            }
          }
          break
        }
      }
    }

    if (field.nestedFields && value?.nestedFields) {
      Object.entries(field.nestedFields).forEach(([optionIndex, nestedFields]) => {
        const optionNestedValues = value.nestedFields[optionIndex] || {}
        nestedFields.forEach(nestedField => {
          const nestedValue = optionNestedValues[nestedField.id]
          const nestedErrors = validateNestedField(nestedField, nestedValue)
          if (nestedErrors.length > 0) {
            errors.push(`${nestedField.label}: ${nestedErrors[0]}`)
          }
        })
      })
    }

    return errors
  }

  if (previewFields.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Fields to Preview</h3>
          <p className="text-muted-foreground mb-4">
            Switch back to builder mode and add some fields to see the form preview.
          </p>
          <Badge variant="outline" className="text-xs">
            Add fields from the palette to get started
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Form Preview</h2>
          <p className="text-muted-foreground">
            This is how your form will appear to users. All validation rules are active.
          </p>

          {/* Field Statistics */}
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              {previewFields.length} total fields
            </Badge>
            {tableColumnFields.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tableColumnFields.length} from table
              </Badge>
            )}
            {regularFormFields.length > 0 && (
              <Badge variant="default" className="text-xs">
                {regularFormFields.length} custom fields
              </Badge>
            )}
          </div>
        </div>

        {/* Form Configuration Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Form Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-name" className="text-sm font-medium">
                Form Name *
              </Label>
              <Input
                id="form-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter form name"
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-description" className="text-sm font-medium">
                Description
              </Label>
              <Input
                id="form-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter form description"
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retry-count" className="text-sm font-medium">
                Number of Edit Attempts
              </Label>
              <Input
                id="retry-count"
                type="number"
                min="1"
                max="10"
                value={retryCount}
                onChange={(e) => setRetryCount(e.target.value)}
                placeholder="Enter number of edit attempts"
                className="bg-input"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of times users can edit their form submission
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Form Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground">Fill out the form below to test validation and submission.</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
              className="space-y-6"
            >
              {previewFields.map((field) => (
                <form.Field
                  key={field.id}
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
                    //Process the field to ensure options and nested fields are properly structured
                    const processedField = {
                      ...field,
                      options: processFieldOptions(field),
                      //Preserve the original nestedFields structure for FieldRenderer
                      nestedFields: field.nestedFields || {}
                    }

                    //Auto-select the first option that has nested field for preview
                    const currentValue = fieldApi.state.value
                    if (!currentValue && processedField.options && processedField.options.length > 0) {
                      const firstOptionWithNestedFields = processedField.options.find(option =>
                        option.nestedFields && option.nestedFields.length > 0
                      )
                      if (firstOptionWithNestedFields) {
                        // Auto-select the first option with nested fields
                        setTimeout(() => {
                          fieldApi.handleChange({
                            value: firstOptionWithNestedFields.value,
                            nestedFields: {}
                          })
                        }, 0)
                      }
                    }

                    return (
                      <div className="space-y-1">
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
              ))}

              <Separator />

              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  {previewFields.length} {previewFields.length === 1 ? "field" : "fields"} • {previewFields.filter((f) => f.required).length}{" "}
                  required
                </div>

                {!isEditMode && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGenerateLink}
                      disabled={isGenerating || previewFields.length === 0}
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          Generate Link
                        </>
                      )}
                    </Button>
                    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                      {([canSubmit, isSubmitting]) => (
                        <Button type="submit" disabled={true} className="gap-2">
                          <Send className="h-4 w-4" />
                          {isSubmitting ? "Submitting..." : "Submit Form"}
                        </Button>
                      )}
                    </form.Subscribe>
                  </div>
                )}
              </div>
            </form>

            {/* Generated Link Section */}
            {!isEditMode && generatedLink && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Form Link Generated
                </Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="bg-background font-mono text-sm flex-1"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="gap-2 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  ✅ User ID ({USER_ID.substring(0, 8)}...) is included in the link for lead attribution
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={openFormInNewTab}
                    variant="default"
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Form
                  </Button>
                  <Button
                    onClick={() => {
                      copyToClipboard()
                      openFormInNewTab()
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy & Open
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this link with users to collect form responses. Click "Open Form" to view the form in a new tab.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Data Debug Panel */}
        {/* <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Form Structure (Debug)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Table Columns ({tableColumnFields.length})</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
                  {JSON.stringify(tableColumnFields.map(f => ({
                    id: f.tableColumnId,
                    name: f.tableColumnName,
                    type: f.type,
                    required: f.required
                  })), null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Extra Fields ({regularFormFields.length})</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
                  {JSON.stringify(regularFormFields.map(f => ({
                    name: f.label,
                    type: f.type,
                    required: f.required
                  })), null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  )
}