"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import { 
  ArrowLeft, 
  Database, 
  RefreshCw, 
  AlertCircle, 
  Search,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Settings
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import axios from "axios"
import { authUtils } from '@/lib/auth-utils'
import { useParams, useRouter } from "next/navigation"

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const ORGANIZATION_ID = process.env.NEXT_PUBLIC_ORGANIZATION_ID
const TABLE_ID = process.env.NEXT_PUBLIC_TABLE_ID

export default function FormSubmissionsPage() {
  const params = useParams()
  const router = useRouter()
  const formId = params.formId
  
  const [formDetails, setFormDetails] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isNestedModalOpen, setIsNestedModalOpen] = useState(false)
  const [nestedData, setNestedData] = useState(null)
  const [currentField, setCurrentField] = useState(null)
  const [currentSubmission, setCurrentSubmission] = useState(null)

  // Fetch form details and submissions on component mount
  useEffect(() => {
    if (formId) {
      fetchFormDetails()
      fetchSubmissions()
    }
  }, [formId])

  const fetchFormDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/forms/${ORGANIZATION_ID}/${TABLE_ID}/${formId}`,
        {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          }
        }
      )

      if (response.data.success && response.data.form) {
        setFormDetails(response.data.form)
      } else {
        throw new Error('Form not found')
      }
    } catch (err) {
      const errorMsg = `Failed to fetch form details: ${err.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error fetching form details:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/submit/all/${ORGANIZATION_ID}/${formId}`,
        {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          }
        }
      )

      if (response.data.success && Array.isArray(response.data.submissions)) {
        // Map submissions to include proper date handling
        const mappedSubmissions = response.data.submissions.map(submission => ({
          ...submission,
          created_at: submission.created_at || submission.last_edited_at || new Date().toISOString()
        }))
        setSubmissions(mappedSubmissions)
        toast.success(`Loaded ${mappedSubmissions.length} submissions successfully!`)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      const errorMsg = `Failed to fetch submissions: ${err.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error fetching submissions:", err)
    } finally {
      setLoading(false)
    }
  }

  const parseJsonSafely = (value) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'object') return value
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    if (!trimmed) return ''
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed)
      } catch (error) {
        console.warn('parseJsonSafely error:', error)
        return value
      }
    }
    return value
  }

  const formatDateOnly = (input) => {
    if (input instanceof Date && !Number.isNaN(input.getTime())) {
      return input.toLocaleDateString()
    }

    if (input === null || input === undefined) return null

    const str = String(input).trim()
    if (!str) return null

    const direct = new Date(str)
    if (!Number.isNaN(direct.getTime())) {
      return direct.toLocaleDateString()
    }

    const match = str.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2})(?::(\d{2})(?::(\d{2}))?)?)?$/)
    if (match) {
      const [ , datePart ] = match
      const [yearStr, monthStr, dayStr] = datePart.split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)
      const day = Number(dayStr)

      if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
        const dateObj = new Date(year, month - 1, day)
        if (!Number.isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString()
        }
      }

      return datePart
    }

    return null
  }

  const formatPhoneDisplay = (value) => {
    const parsed = parseJsonSafely(value)
    if (parsed && typeof parsed === 'object') {
      const countryCode = parsed.countryCode || parsed.code || ''
      const number = parsed.number || parsed.value || ''
      const country = parsed.country || ''
      const line = [countryCode, number].filter(Boolean).join(' ').trim()
      return (
        <div className="text-sm">
          {line && <div className="font-medium">{line}</div>}
          {country && <div className="text-xs text-muted-foreground">{country}</div>}
        </div>
      )
    }
    return <span className="truncate max-w-[200px]">{String(value ?? '')}</span>
  }

  const formatLocationDisplay = (value) => {
    const parsed = parseJsonSafely(value)
    if (parsed && typeof parsed === 'object') {
      const title = parsed.address || parsed.name || ''
      const subtitle = [parsed.city, parsed.state, parsed.country].filter(Boolean).join(', ')
      return (
        <div className="text-sm">
          {title && <div className="font-medium">{title}</div>}
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      )
    }
    return <span className="truncate max-w-[200px]">{String(value ?? '')}</span>
  }

  // Check if field has nested data
  const hasNestedData = (field, value) => {
    if (!value) return false
    
    const parsed = parseJsonSafely(value)
    if (!parsed || typeof parsed !== 'object') return false
    
    // Check if it has nestedValues structure
    if (parsed.nestedValues && typeof parsed.nestedValues === 'object' && Object.keys(parsed.nestedValues).length > 0) {
      return true
    }
    
    // Check if it's an array with nested values
    if (Array.isArray(parsed)) {
      return parsed.some(item => item && typeof item === 'object' && item.nestedValues && Object.keys(item.nestedValues).length > 0)
    }
    
    return false
  }

  // Helper function to normalize nested fields structure
  const normalizeNestedFields = (nestedFields) => {
    if (!nestedFields || !Array.isArray(nestedFields)) return []
    
    return nestedFields.map(field => {
      // If it's already an object with the right structure, return it
      if (typeof field === 'object' && field !== null) {
        return {
          id: field.id,
          name: field.name || field.label || field.id,
          label: field.label || field.name || field.id,
          type: field.type || 'text',
          nestedFields: field.nestedFields ? normalizeNestedFields(field.nestedFields) : []
        }
      }
      return field
    })
  }

  // Parse nested data structure
  const parseNestedData = (fieldValue, field) => {
    try {
      const parsed = JSON.parse(fieldValue)
      let options = field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : []
      
      // Normalize nested fields in options (recursively at all levels)
      const normalizeOptionsRecursively = (opts) => {
        return opts.map(option => {
          if (typeof option === 'object' && option !== null) {
            const normalizedOption = { ...option }
            if (normalizedOption.nestedFields && Array.isArray(normalizedOption.nestedFields)) {
              normalizedOption.nestedFields = normalizedOption.nestedFields.map(nestedField => {
                const normalized = {
                  id: nestedField.id,
                  name: nestedField.name || nestedField.label || nestedField.id,
                  label: nestedField.label || nestedField.name || nestedField.id,
                  type: nestedField.type || 'text',
                  nestedFields: [],
                  options: []
                }
                // Recursively normalize nested fields within nested fields
                if (nestedField.nestedFields && Array.isArray(nestedField.nestedFields)) {
                  normalized.nestedFields = nestedField.nestedFields.map(deepNestedField => {
                    return {
                      id: deepNestedField.id,
                      name: deepNestedField.name || deepNestedField.label || deepNestedField.id,
                      label: deepNestedField.label || deepNestedField.name || deepNestedField.id,
                      type: deepNestedField.type || 'text',
                      nestedFields: [],
                      options: []
                    }
                  })
                }
                // Also check if nestedField has options with nestedFields (for select/radio/checkbox fields)
                if (nestedField.options && Array.isArray(nestedField.options)) {
                  normalized.options = normalizeOptionsRecursively(nestedField.options)
                }
                return normalized
              })
            }
            return normalizedOption
          }
          return option
        })
      }
      
      options = normalizeOptionsRecursively(options)
      
      const isMulti = Array.isArray(parsed)
      
      const result = {
        fieldName: field.label || field.name,
        isMulti: isMulti,
        selectedValue: isMulti ? parsed.map(item => item.value) : parsed.value,
        options: options,
        formData: {}
      }

      // Recursively extract form data
      const extractFormData = (nestedValues, parentFields) => {
        const formData = {}
        
        if (!nestedValues || typeof nestedValues !== 'object') return formData

        Object.entries(nestedValues).forEach(([fieldId, fieldData]) => {
          // Find the field definition from parentFields
          let fieldDef = null
          if (parentFields && Array.isArray(parentFields)) {
            fieldDef = parentFields.find(f => f.id === fieldId)
          }
          
          if (fieldData && typeof fieldData === 'object') {
            if (fieldData.value !== undefined) {
              // Get nested fields for this field - prioritize from selected option if it's a select/radio/checkbox
              let nestedFieldsForThisField = []
              
              if (fieldDef) {
                // If fieldDef has options (select/radio/checkbox), find the selected option and get its nestedFields
                if (fieldDef.options && Array.isArray(fieldDef.options)) {
                  const selectedOption = fieldDef.options.find(opt => 
                    opt.value === fieldData.value || opt.label === fieldData.value
                  )
                  if (selectedOption && selectedOption.nestedFields && Array.isArray(selectedOption.nestedFields)) {
                    nestedFieldsForThisField = selectedOption.nestedFields
                  }
                }
                // Otherwise, if fieldDef has nestedFields directly, use those
                else if (fieldDef.nestedFields && Array.isArray(fieldDef.nestedFields)) {
                  nestedFieldsForThisField = fieldDef.nestedFields
                }
              }
              
              // Use fieldDef if found, otherwise create fallback
              const finalFieldDef = fieldDef ? {
                id: fieldDef.id || fieldId,
                name: fieldDef.name || fieldDef.label || fieldId,
                label: fieldDef.label || fieldDef.name || fieldId,
                type: fieldDef.type || 'text',
                nestedFields: nestedFieldsForThisField,
                options: fieldDef.options || []
              } : { 
                id: fieldId, 
                name: fieldId, 
                label: fieldId, 
                type: 'text',
                nestedFields: [],
                options: []
              }
              
              formData[fieldId] = {
                fieldDef: finalFieldDef,
                value: fieldData.value,
                nestedData: fieldData.nestedValues 
                  ? extractFormData(fieldData.nestedValues, nestedFieldsForThisField)
                  : {}
              }
            }
          }
        })
        
        return formData
      }

      // Handle root array structure (multiple selections)
      if (isMulti) {
        parsed.forEach((item, index) => {
          if (item.nestedValues && Object.keys(item.nestedValues).length > 0) {
            const selectedOption = options.find(opt => opt.value === item.value || opt.label === item.value)
            const nestedFields = selectedOption?.nestedFields || []
            const itemFormData = extractFormData(item.nestedValues, nestedFields)
            
            Object.entries(itemFormData).forEach(([fieldId, fieldInfo]) => {
              const prefixedFieldId = `${index}_${fieldId}`
              result.formData[prefixedFieldId] = {
                ...fieldInfo,
                _originalFieldId: fieldId,
                _selectionIndex: index,
                _selectionValue: item.value
              }
            })
          }
        })
      } else {
        // Handle single selection
        if (parsed.nestedValues) {
          const selectedOption = options.find(opt => opt.value === parsed.value || opt.label === parsed.value)
          const nestedFields = selectedOption?.nestedFields || []
          result.formData = extractFormData(parsed.nestedValues, nestedFields)
        }
      }

      return result
    } catch (error) {
      console.error('Error parsing nested data:', error)
      return null
    }
  }

  // Function to open nested data modal
  const openNestedModal = (fieldValue, field, submission) => {
    const nestedData = parseNestedData(fieldValue, field)
    if (nestedData) {
      setNestedData(nestedData)
      setCurrentField(field)
      setCurrentSubmission(submission)
      setIsNestedModalOpen(true)
    }
  }

  // Helper function to format field value based on data type
  const formatFieldValue = (rawValue, field, submission) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return <span className="text-muted-foreground italic">-</span>
    }

    const fieldType = field.type || 'text'
    const rawString = typeof rawValue === 'string' ? rawValue : String(rawValue)
    const trimmed = rawString.trim()

    // Check if it has nested data
    if (hasNestedData(field, rawString)) {
      let displayLabel = ''
      const parsed = parseJsonSafely(rawString)
      
      if (Array.isArray(parsed)) {
        displayLabel = parsed
          .map(item => {
            if (!item || typeof item !== 'object') return ''
            if (Array.isArray(item.value)) return item.value.join(' → ')
            if (item.value !== undefined && item.value !== null) return String(item.value)
            return ''
          })
          .filter(Boolean)
          .join(', ')
      } else {
        if (Array.isArray(parsed.value)) {
          displayLabel = parsed.value.join(' → ')
        } else if (parsed.value !== undefined && parsed.value !== null) {
          displayLabel = String(parsed.value)
        }
      }

      if (!displayLabel) {
        displayLabel = 'View details'
      }

      return (
        <button
          onClick={() => openNestedModal(rawString, field, submission)}
          className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer px-2 py-1 rounded border border-blue-300 text-sm font-medium"
          title="Click to view nested data"
        >
          {displayLabel}
          <span className="ml-1 text-xs">📋</span>
        </button>
      )
    }

    // Parse JSON if it looks like JSON
    const parsedValue = parseJsonSafely(rawString)
    const isArrayStructure = Array.isArray(parsedValue)
    
    // Handle simple value extraction
    if (!isArrayStructure && parsedValue && typeof parsedValue === 'object' && parsedValue.value !== undefined) {
      const simpleValue = parsedValue.value
      
      switch (fieldType) {
        case 'email':
          return (
            <a href={`mailto:${simpleValue}`} className="text-blue-600 hover:underline">
              {simpleValue}
            </a>
          )
        case 'phone':
          return formatPhoneDisplay(parsedValue)
        case 'location':
          return formatLocationDisplay(parsedValue)
        case 'date':
        case 'datetime':
          const formatted = formatDateOnly(simpleValue)
          if (formatted) {
            return <span>{formatted}</span>
          }
          return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
        default:
          return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
      }
    }

    // Handle non-JSON values
    switch (fieldType) {
      case 'email':
        return (
          <a href={`mailto:${rawValue}`} className="text-blue-600 hover:underline">
            {rawValue}
          </a>
        )
      case 'phone': {
        let phoneData = parseJsonSafely(rawString)
        if (phoneData && typeof phoneData === 'object') {
          return formatPhoneDisplay(phoneData)
        }
        return (
          <a href={`tel:${rawValue}`} className="text-blue-600 hover:underline">
            {rawValue}
          </a>
        )
      }
      case 'location': {
        let locationData = parseJsonSafely(rawString)
        if (locationData && typeof locationData === 'object') {
          return formatLocationDisplay(locationData)
        }
        return <span className="truncate max-w-[200px]">{String(rawValue)}</span>
      }
      case 'boolean':
        return (
          <Badge variant={rawValue === 'true' || rawValue === true ? 'default' : 'secondary'}>
            {rawValue === 'true' || rawValue === true ? 'Yes' : 'No'}
          </Badge>
        )
      case 'date':
      case 'datetime':
        {
          const formatted = formatDateOnly(rawValue)
          if (formatted) {
            return <span>{formatted}</span>
          }
          return <span className="truncate max-w-[200px]">{String(rawValue)}</span>
        }
      case 'number':
      case 'textarea':
      case 'text':
      case 'select':
      case 'radio':
      case 'checkbox':
        return <span className="truncate max-w-[200px]">{String(rawValue)}</span>
      default:
        return <span className="truncate max-w-[200px]">{String(rawValue)}</span>
    }
  }

  // Get field value from submission
  const getFieldValue = (submission, fieldId) => {
    if (!submission.values || !submission.values[fieldId]) return null
    return submission.values[fieldId]
  }

  // Filter submissions based on search term
  const filteredSubmissions = submissions.filter(submission => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    
    // Search in field values
    if (submission.values) {
      const fieldValues = Object.values(submission.values)
      if (fieldValues.some(value => 
        value && String(value).toLowerCase().includes(searchLower)
      )) {
        return true
      }
    }
    
    // Search in submission ID
    if (submission.submission_id && submission.submission_id.toLowerCase().includes(searchLower)) {
      return true
    }
    
    return false
  })

  // Create dynamic columns based on form fields
  const createDynamicColumns = () => {
    if (!formDetails || !formDetails.fields || !Array.isArray(formDetails.fields)) return []
  
    const dynamicColumns = formDetails.fields.map((field) => {
      // Parse field if it's a string
      let parsedField = field
      if (typeof field === 'string') {
        try {
          parsedField = JSON.parse(field)
        } catch (e) {
          parsedField = { id: field, label: field, type: 'text' }
        }
      }
      
      // Handle character-by-character JSON format
      if (typeof parsedField === 'object' && parsedField !== null && !Array.isArray(parsedField)) {
        const keys = Object.keys(parsedField).filter(key => !isNaN(key))
        if (keys.length > 0) {
          try {
            const jsonString = keys
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => parsedField[key])
              .join('')
            if (jsonString.trim()) {
              parsedField = JSON.parse(jsonString)
            }
          } catch (e) {
            console.warn('Failed to parse field:', e)
          }
        }
      }
      
      // Parse options if it's a string
      if (parsedField.options && typeof parsedField.options === 'string') {
        try {
          parsedField.options = JSON.parse(parsedField.options)
        } catch (e) {
          parsedField.options = []
        }
      }
      
      const fieldId = parsedField.id || parsedField.name || field
      
      return {
        accessorKey: fieldId,
        header: parsedField.label || parsedField.name || fieldId,
        cell: ({ row }) => {
          const submission = row.original
          const fieldValue = getFieldValue(submission, fieldId)
          return formatFieldValue(fieldValue, parsedField, submission)
        },
      }
    })

    // Add metadata columns
    const metadataColumns = [
      {
        accessorKey: "created_at",
        header: "Submitted At",
        cell: ({ row }) => {
          const submission = row.original
          // Use last_edited_at if created_at is not available or is in unexpected format
          const dateValue = submission.created_at || submission.last_edited_at
          if (!dateValue) return <span className="text-muted-foreground">-</span>
          
          // Handle different date formats
          let dateObj
          if (dateValue instanceof Date) {
            dateObj = dateValue
          } else if (typeof dateValue === 'string') {
            // Check if it's a UUID format (like in the API response)
            if (dateValue.length === 36 && dateValue.includes('-')) {
              // It's a UUID, try to get from last_edited_at instead
              dateObj = submission.last_edited_at ? new Date(submission.last_edited_at) : null
            } else {
              dateObj = new Date(dateValue)
            }
          } else {
            return <span className="text-muted-foreground">-</span>
          }
          
          if (!dateObj || Number.isNaN(dateObj.getTime())) {
            return <span className="text-muted-foreground">-</span>
          }
          
          return (
            <div className="text-sm">
              <div className="font-medium text-foreground">
                {dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {dateObj.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const submission = row.original
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary/10"
                title="View submission"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          )
        },
      },
    ]

    return [...dynamicColumns, ...metadataColumns]
  }

  // Recursive component to render nested form fields
  const renderNestedFormFields = (formData, level = 0) => {
    if (!formData || Object.keys(formData).length === 0) return null

    return (
      <div className={`space-y-4 ${level > 0 ? 'ml-6 pl-4 border-l-2 border-primary/20' : ''}`}>
        {Object.entries(formData).map(([fieldId, fieldInfo]) => {
          const { fieldDef, value, nestedData } = fieldInfo
          
          return (
            <div key={fieldId} className="space-y-2">
              {/* Field Label */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  {fieldDef.name || fieldDef.label || fieldDef.id || fieldId}
                </label>
                <Badge variant="outline" className="text-xs">
                  {fieldDef.type || 'text'}
                </Badge>
              </div>

              {/* Field Value */}
              <div className="text-sm">
                {value ? (
                  <span className="text-foreground">{String(value)}</span>
                ) : (
                  <span className="text-muted-foreground italic">-</span>
                )}
              </div>

              {/* Render nested fields recursively */}
              {nestedData && Object.keys(nestedData).length > 0 && (
                <Card className="mt-3 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                  <CardHeader className="pb-3 px-4 pt-3">
                    <CardTitle className="text-sm font-semibold text-primary">
                      Nested Fields
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {renderNestedFormFields(nestedData, level + 1)}
                  </CardContent>
                </Card>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading && (!formDetails || submissions.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading form submissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/my-forms')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Forms
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              {formDetails?.form_name || 'Form Submissions'}
            </h1>
            <p className="text-muted-foreground">
              {formDetails?.description || "View all submitted data for this form"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchSubmissions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => {
                fetchFormDetails()
                fetchSubmissions()
              }} className="ml-2">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-bold">{submissions.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Form Fields</p>
                <p className="text-2xl font-bold">{formDetails?.fields?.length || 0}</p>
              </div>
              <Settings className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Form Version</p>
                <p className="text-2xl font-bold">v{formDetails?.version || 1}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-2xl font-bold">
                  <Badge variant={formDetails?.published ? 'default' : 'secondary'}>
                    {formDetails?.published ? 'Published' : 'Draft'}
                  </Badge>
                </p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Form Submissions</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredSubmissions.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Custom Search Input */}
          <div className="flex items-center py-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          {/* Table with negative margins to counteract CardContent padding for horizontal scroll */}
          <div className="-mx-6 px-6 overflow-x-auto">
            <div style={{ minWidth: 'max-content' }}>
              <DataTable 
                columns={createDynamicColumns()} 
                data={filteredSubmissions} 
                searchKey=""
                searchPlaceholder=""
                showColumnsDropdown={false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nested Data Modal */}
      <Dialog open={isNestedModalOpen} onOpenChange={setIsNestedModalOpen}>
        <DialogContent className="w-[80vw] sm:w-[75vw] max-w-[1000px] sm:max-w-none max-h-[95vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Nested Data - {nestedData?.fieldName}</DialogTitle>
            <DialogDescription>
              Detailed view of nested field values
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {nestedData && (
              <div className="space-y-6">
                {/* Root Selected Value */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border-l-4 border-primary">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        Primary Selection{nestedData.isMulti ? 's' : ''}
                      </h4>
                    </div>
                    
                    {nestedData.isMulti ? (
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(nestedData.selectedValue) ? (
                          nestedData.selectedValue.map((val, idx) => (
                            <Badge key={idx} variant="default" className="text-base px-4 py-1">
                              {val}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="default" className="text-base px-4 py-1">
                            {nestedData.selectedValue}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="default" className="text-base px-4 py-1">
                        {nestedData.selectedValue}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Nested Form Fields */}
                {Object.keys(nestedData.formData).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h4 className="font-semibold text-base text-foreground">Nested Form Fields</h4>
                      <Badge variant="secondary" className="text-xs">
                        {Object.keys(nestedData.formData).length} fields
                      </Badge>
                    </div>
                    <div className="space-y-4 pb-4">
                      {nestedData.isMulti ? (
                        // Group fields by selection for multi-select
                        (() => {
                          const groupedBySelection = {}
                          Object.entries(nestedData.formData).forEach(([fieldId, fieldInfo]) => {
                            const index = fieldInfo._selectionIndex
                            if (index !== undefined) {
                              if (!groupedBySelection[index]) {
                                groupedBySelection[index] = {
                                  value: fieldInfo._selectionValue,
                                  fields: {}
                                }
                              }
                              groupedBySelection[index].fields[fieldId] = fieldInfo
                            }
                          })
                          
                          return Object.keys(groupedBySelection).sort().map(index => (
                            <Card key={index} className="bg-gradient-to-br from-blue-50/50 to-transparent border-blue-200">
                              <CardHeader className="pb-3 px-4 pt-3">
                                <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                                  <Badge variant="default" className="text-xs">
                                    Selection {parseInt(index) + 1}
                                  </Badge>
                                  {groupedBySelection[index].value}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="px-4 pb-4">
                                {Object.keys(groupedBySelection[index].fields).length === 0 ? (
                                  <div className="text-sm text-muted-foreground italic py-2">
                                    No nested fields for this selection
                                  </div>
                                ) : (
                                  renderNestedFormFields(groupedBySelection[index].fields)
                                )}
                              </CardContent>
                            </Card>
                          ))
                        })()
                      ) : (
                        // Single selection - render normally
                        renderNestedFormFields(nestedData.formData)
                      )}
                    </div>
                  </div>
                )}

                {/* No nested data message */}
                {Object.keys(nestedData.formData).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No nested fields available for this selection</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-4">
            <Button variant="outline" onClick={() => setIsNestedModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

