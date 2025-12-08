"use client"

import { useForm } from "@tanstack/react-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle2, Settings } from "lucide-react"
import { FieldRenderer } from "./field-renderer"
import { useState, useEffect, useMemo, useCallback, memo } from "react"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { authUtils } from '@/lib/auth-utils'
import { useRouter } from 'next/navigation'

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

  // Check if options is a string and try to parse it as JSON
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

// Helper function to recursively process nested fields structure
const processNestedFieldsRecursively = (nestedFields) => {
  if (!Array.isArray(nestedFields)) {
    return []
  }

  return nestedFields.map((nestedField, index) => {

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
      required: false,
      validation: validation,
      options: processFieldOptions(nestedField)
    }

    // Recursively process nested fields within this field
    if (nestedField.nestedFields) {
      if (Array.isArray(nestedField.nestedFields)) {
        processedField.nestedFields = processNestedFieldsRecursively(nestedField.nestedFields)
      } else if (typeof nestedField.nestedFields === 'object') {
        // Handle the case where nested fields are stored as an object with indices
        const nestedFieldsArray = Object.values(nestedField.nestedFields).flat()
        processedField.nestedFields = processNestedFieldsRecursively(nestedFieldsArray)
      } else {
        processedField.nestedFields = []
      }
    } else {
      // If no direct nestedFields, check if the options have nested fields
      // This handles the case where nested fields are stored in options
      if (processedField.options && Array.isArray(processedField.options)) {
        const allNestedFields = []
        processedField.options.forEach(option => {
          if (option.nestedFields && Array.isArray(option.nestedFields)) {
            allNestedFields.push(...option.nestedFields)
          }
        })
        if (allNestedFields.length > 0) {
          processedField.nestedFields = processNestedFieldsRecursively(allNestedFields)
        } else {
          processedField.nestedFields = []
        }
      } else {
        processedField.nestedFields = []
      }
    }

    return processedField
  })
}

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const ORGANIZATION_ID = process.env.NEXT_PUBLIC_ORGANIZATION_ID
const TABLE_ID = process.env.NEXT_PUBLIC_TABLE_ID

export function FormPreview({ fields, isEditMode = false, formData = null, onRetryCountChange = null }) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [retryCount, setRetryCount] = useState("2")
  const [mappedGene, setMappedGene] = useState("")
  const [availableGenes, setAvailableGenes] = useState([])
  const [isLoadingGenes, setIsLoadingGenes] = useState(false)

  // Check authentication
  useEffect(() => {
    if (!authUtils.isAuthenticated()) {
      router.push('/login')
      return
    }
  }, [router])

  // Get user data from localStorage
  const getUserData = () => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      return userData ? JSON.parse(userData) : null
    }
    return null
  }

  // Get user ID from localStorage
  const getUserId = () => {
    const userData = getUserData()
    return userData?.user_id || null
  }

  // Fetch genes from API
  const fetchGenes = useCallback(async () => {
    setIsLoadingGenes(true)
    try {
      const response = await axios.get('http://10.10.15.194:3001/api/genes', {
        headers: {
          'Authorization': authUtils.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      })

      if (response.data.success) {
        const userData = getUserData()
        const userGeneIds = userData?.g_ids || []

        // Filter genes to only show those the user is mapped to
        const userGenes = response.data.data.filter(gene =>
          userGeneIds.includes(gene.g_id)
        )

        setAvailableGenes(userGenes)

        // Auto-select if there's only one gene
        if (userGenes.length === 1) {
          setMappedGene(prev => prev || userGenes[0].g_id)
        }

        // If in edit mode and formData has mapped_gene, set it
        if (isEditMode && formData?.mapped_gene) {
          setMappedGene(prev => prev || formData.mapped_gene)
        }
      } else {
        toast.error("Failed to load genes")
      }
    } catch (error) {
      console.error('Error fetching genes:', error)
      toast.error("Failed to load genes list")
    } finally {
      setIsLoadingGenes(false)
    }
  }, [isEditMode, formData?.mapped_gene])

  // Populate form metadata when in edit mode
  useEffect(() => {
    if (isEditMode && formData) {
      setFormName(formData.formName || "")
      setFormDescription(formData.description || "")
      setRetryCount(formData.max_retry_count?.toString() || "2")
      setMappedGene(formData.mapped_gene || "")
    }
  }, [isEditMode, formData])

  // Fetch genes on component mount
  useEffect(() => {
    if (authUtils.isAuthenticated()) {
      fetchGenes()
    }
  }, [fetchGenes])

  // Notify parent component when retry count changes
  useEffect(() => {
    if (onRetryCountChange && isEditMode) {
      onRetryCountChange(retryCount)
    }
  }, [retryCount, onRetryCountChange, isEditMode])

  const previewFields = useMemo(() =>
    fields.filter(field => field.type !== "table_column"),
    [fields]
  )

  const tableColumnFields = useMemo(() =>
    previewFields.filter(field => field.source === 'table'),
    [previewFields]
  )

  const groupFieldsList = useMemo(() =>
    previewFields.filter(field => field.type === 'group' && field.source !== 'table'),
    [previewFields]
  )

  const regularFormFields = useMemo(() =>
    previewFields.filter(field => field.source !== 'table' && field.type !== 'group'),
    [previewFields]
  )

  const defaultValues = useMemo(() => {
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
  }, [previewFields])

  const form = useForm({
    defaultValues: defaultValues,
    onSubmit: async ({ value }) => {
      console.log("Form submitted:", value)
      toast.success("Form submitted successfully")
    },
  })

  const handleSaveForm = async () => {
    // Check authentication
    if (!authUtils.isAuthenticated()) {
      router.push('/login')
      return
    }

    if (!formName.trim()) {
      toast.error("Please enter a form name")
      return
    }

    if (!mappedGene) {
      toast.error("Please select a mapped gene")
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

    // Get user ID from localStorage
    const userId = getUserId()
    if (!userId) {
      toast.error("User not found. Please log in again.")
      router.push('/login')
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

              // Check for nested fields in the option itself (for deep table column nesting)
              if (nestedOption.nestedFields && Array.isArray(nestedOption.nestedFields)) {
                nestedOptionObj.nestedFields = processNestedFields(
                  nestedOption.nestedFields,
                  nestedOptionIndex
                )
              }
              // Fallback: check nested fields in the field structure (for form builder fields)
              else if (nestedField.nestedFields && nestedField.nestedFields[nestedOptionIndex]) {
                nestedOptionObj.nestedFields = processNestedFields(
                  nestedField.nestedFields[nestedOptionIndex],
                  nestedOptionIndex
                )
              }

              return nestedOptionObj
            })
          }

          // Strip "field-" prefix from nested field ID before sending
          let cleanNestedFieldId = nestedField.id
          if (typeof cleanNestedFieldId === 'string' && cleanNestedFieldId.startsWith('field-')) {
            cleanNestedFieldId = cleanNestedFieldId.replace('field-', '')
          }

          const processedNestedField = {
            id: cleanNestedFieldId,
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

            // Process nested fields for this option - check both structures
            if (option.nestedFields && Array.isArray(option.nestedFields)) {
              optionObj.nestedFields = processNestedFields(option.nestedFields, index)
            }
            else if (field.nestedFields && field.nestedFields[index]) {
              optionObj.nestedFields = processNestedFields(field.nestedFields[index], index)
            }

            return optionObj
          })
        }

        const hasNestedFields = optionsArray.some(option =>
          option.nestedFields && option.nestedFields.length > 0
        )

        let cleanFieldId = field.tableColumnId || field.id
        if (typeof cleanFieldId === 'string' && cleanFieldId.startsWith('field-')) {
          cleanFieldId = cleanFieldId.replace('field-', '')
        }

        const fieldObj = {
          id: cleanFieldId,
          name: field.tableColumnName || field.label.toLowerCase().replace(/\s+/g, '_'),
          label: field.label,
          type: field.type,
          required: field.required || false,
          validations: field.validation || {},
          hasNested: hasNestedFields,
          options: optionsArray,
          isLeadColumn: field.isLeadColumn || false
        }

        return fieldObj
      })

      // Prepare extra fields
      const extraFields = regularFormFields.map(field => {
        let optionsArray = []

        if (field.options && Array.isArray(field.options)) {
          optionsArray = field.options.map((option, index) => {
            const optionObj = {
              value: typeof option === 'string' ? option : option.value,
              label: typeof option === 'string' ? option : option.label,
              nestedFields: []
            }

            // Process nested fields for this option - check both structures
            // First check if option already has nestedFields (for table columns)
            if (option.nestedFields && Array.isArray(option.nestedFields)) {
              optionObj.nestedFields = processNestedFields(option.nestedFields, index)
            }
            // Then check if field has nestedFields[index] (for form builder fields)
            else if (field.nestedFields && field.nestedFields[index]) {
              optionObj.nestedFields = processNestedFields(field.nestedFields[index], index)
            }

            return optionObj
          })
        }

        const hasNestedFields = optionsArray.some(option =>
          option.nestedFields && option.nestedFields.length > 0
        )

        // Strip "field-" prefix from extra field ID
        let cleanFieldId = field.id
        if (typeof cleanFieldId === 'string' && cleanFieldId.startsWith('field-')) {
          cleanFieldId = cleanFieldId.replace('field-', '')
        }

        const fieldObj = {
          id: cleanFieldId,
          name: field.label.toLowerCase().replace(/\s+/g, '_'),
          label: field.label,
          type: field.type,
          required: field.required || false,
          validations: field.validation || {},
          hasNested: hasNestedFields,
          options: optionsArray,
          isLeadColumn: field.isLeadColumn || false
        }

        return fieldObj
      })

      // Check if we have any fields to send
      if (tableFields.length === 0 && extraFields.length === 0 && groupFieldsList.length === 0) {
        toast.error("No valid fields to add to the form")
        setIsGenerating(false)
        return
      }

      // Helper function to process subFields inside group fields
      const processSubFieldForAPI = (subField) => {
        // Strip "field-" prefix from subfield ID
        let cleanSubFieldId = subField.id
        if (typeof cleanSubFieldId === 'string' && cleanSubFieldId.startsWith('field-')) {
          cleanSubFieldId = cleanSubFieldId.replace('field-', '')
        }

        let optionsArray = []
        if (subField.options && Array.isArray(subField.options)) {
          optionsArray = subField.options.map(option => ({
            value: typeof option === 'string' ? option : option.value,
            label: typeof option === 'string' ? option : option.label,
            nestedFields: []
          }))
        }

        return {
          id: cleanSubFieldId,
          name: subField.label?.toLowerCase().replace(/\s+/g, '_') || subField.name,
          label: subField.label,
          type: subField.type,
          required: subField.required ? "true" : "false",
          validations: subField.validation || subField.validations || {},
          hasNested: false,
          options: optionsArray,
          isLeadColumn: subField.isLeadColumn ? "true" : "false"
        }
      }

      // Extract fields from groups and collect field IDs for group references
      const groupSubFieldsForMainArray = []
      const processGroupFieldData = (groupField) => {
        // Strip "field-" prefix from group field ID
        let cleanGroupId = groupField.id
        if (typeof cleanGroupId === 'string' && cleanGroupId.startsWith('field-')) {
          cleanGroupId = cleanGroupId.replace('field-', '')
        }

        // Process all subFields inside the group and collect their IDs
        const fieldIds = []
        if (groupField.subFields && Array.isArray(groupField.subFields)) {
          groupField.subFields.forEach(subField => {
            // Process the subField as a full field object
            const processedSubField = processSubFieldForAPI(subField)
            // Add to the main fields array
            groupSubFieldsForMainArray.push(processedSubField)
            // Collect the field ID for the group reference
            fieldIds.push(processedSubField.id)
          })
        }

        return {
          id: cleanGroupId,
          name: groupField.label?.toLowerCase().replace(/\s+/g, '_') || groupField.name,
          label: groupField.label,
          type: "group",
          required: groupField.required ? "true" : "false",
          fields: fieldIds
        }
      }

      // Process group fields
      const processedGroupFields = groupFieldsList.map(processGroupFieldData)

      // Separate fields based on isLeadColumn setting
      const allFields = [...tableFields, ...extraFields]
      const regularFields = allFields.filter(field => !field.isLeadColumn)
      const leadDatabaseFields = allFields.filter(field => field.isLeadColumn)

      // Helper function to recursively process nested fields for API payload
      const processNestedFieldsForAPI = (nestedFields) => {
        if (!Array.isArray(nestedFields)) return []

        return nestedFields.map(nestedField => {
          // Strip "field-" prefix from nested field ID
          let cleanNestedFieldId = nestedField.id
          if (typeof cleanNestedFieldId === 'string' && cleanNestedFieldId.startsWith('field-')) {
            cleanNestedFieldId = cleanNestedFieldId.replace('field-', '')
          }

          const processedNestedField = {
            id: cleanNestedFieldId,
            name: nestedField.name || nestedField.label?.toLowerCase().replace(/\s+/g, '_'),
            label: nestedField.label,
            type: nestedField.type,
            required: nestedField.required || false,
            validations: nestedField.validation || nestedField.validations || {},
            hasNested: false,
            options: [],
            isLeadColumn: nestedField.isLeadColumn || false
          }

          // Process options for this nested field if it has them
          if (nestedField.options && Array.isArray(nestedField.options)) {
            processedNestedField.options = nestedField.options.map(option => {
              // Handle both string options and object options
              if (typeof option === 'string') {
                return {
                  value: option,
                  label: option,
                  nestedFields: []
                }
              } else {
                return {
                  value: option.value || '',
                  label: option.label || option.value || '',
                  nestedFields: processNestedFieldsForAPI(option.nestedFields || [])
                }
              }
            })
          }

          // Check if this nested field has nested fields
          processedNestedField.hasNested = processedNestedField.options.some(
            option => option.nestedFields && option.nestedFields.length > 0
          )

          return processedNestedField
        })
      }

      // Helper function to process field data
      const processFieldData = (field) => {
        // Ensure options is always an array
        const processedOptions = Array.isArray(field.options) ? field.options : []

        // Strip "field-" prefix from field ID
        let cleanFieldId = field.id
        if (typeof cleanFieldId === 'string' && cleanFieldId.startsWith('field-')) {
          cleanFieldId = cleanFieldId.replace('field-', '')
        }

        const processedField = {
          id: cleanFieldId,
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
            nestedFields: processNestedFieldsForAPI(option.nestedFields || [])
          }))
        }

        return processedField
      }

      // Prepare the form data for API
      const formPayload = {
        organization_id: ORGANIZATION_ID,
        table_id: TABLE_ID,
        form_name: formName,
        description: formDescription,
        g_id: mappedGene,
        created_by: userId,
        extraFields: leadDatabaseFields.map(processFieldData),
        fields: [...regularFields.map(processFieldData), ...groupSubFieldsForMainArray],
        group: JSON.stringify(processedGroupFields),
        published: true,
        retry_count: retryCount
      }

      const endpoint = `${API_BASE_URL}/api/forms`

      try {
        const response = await axios.post(endpoint, formPayload, {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        })

        const result = response.data
        console.log('✅ API Success Response:', result)

        if (result.success && result.data) {
          toast.success("Form saved successfully!")
          router.push('/my-forms')
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
      console.error('❌ Form save error:', error)
      toast.error(error.message || 'Failed to save form')
    } finally {
      setIsGenerating(false)
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

    // File type validation
    if (nestedField.type === "file" && value) {
      const fileType = nestedField.validation?.fileType || "both"

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
      const fileName = value.name || ""
      const fileMimeType = value.type || ""
      const isValidType = allowedTypes.includes(fileMimeType) ||
        allowedExtensions.some(ext => fileName.toLowerCase().endsWith(ext))

      if (!isValidType) {
        errors.push(errorMessage)
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

    // File type validation based on field configuration (if no specific accept validation is set)
    if (field.type === "file" && value && !field.validation?.accept) {
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

      const fileName = value.name || ""
      const fileTypeValue = value.type || ""

      const isValidType = allowedTypes.includes(fileTypeValue) ||
        allowedExtensions.some(ext => fileName.toLowerCase().endsWith(ext))

      if (!isValidType) {
        errors.push(errorMessage)
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

            {/* Map Gene Field */}
            <div className="space-y-2">
              <Label htmlFor="mapped-gene" className="text-sm font-medium">
                Map Gene *
              </Label>
              <select
                id="mapped-gene"
                value={mappedGene}
                onChange={(e) => setMappedGene(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
                disabled={isLoadingGenes}
              >
                <option value="">Select a gene</option>
                {availableGenes.map((gene) => (
                  <option key={gene.g_id} value={gene.g_id}>
                    {gene.g_name}
                  </option>
                ))}
              </select>
              {isLoadingGenes && (
                <p className="text-xs text-muted-foreground">Loading genes...</p>
              )}
              {!isLoadingGenes && availableGenes.length === 0 && (
                <p className="text-xs text-muted-foreground text-amber-600">
                  No genes available. You are not mapped to any genes.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Select the gene this form will be mapped to
              </p>
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
                onWheel={(e) => e.target.blur()}
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
                          // Handle different field types for auto-selection
                          if (processedField.type === 'checkbox' || (processedField.type === 'select' && processedField.validation?.multiple)) {
                            // For checkbox and multi-select fields, use array format
                            fieldApi.handleChange({
                              value: [firstOptionWithNestedFields.value],
                              nestedFields: {}
                            })
                          } else {
                            // For single select, radio, and other fields, use single value
                            fieldApi.handleChange({
                              value: firstOptionWithNestedFields.value,
                              nestedFields: {}
                            })
                          }
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
                      variant="default"
                      onClick={handleSaveForm}
                      disabled={isGenerating || previewFields.length === 0}
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Save Form
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </form>
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