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
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Settings,
  Search
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import axios from "axios"

// API Configuration
const API_BASE_URL = 'http://10.10.15.194:3001'
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYxNTQ1NTU4LCJleHAiOjE3NjE2MzE5NTh9.KG9CGv2EvC-DmEiGnS9ob6Ab1hQSStI6tT6dklvbhvM'

export default function TableDataView({ table, onBack }) {
  const [columns, setColumns] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isNestedModalOpen, setIsNestedModalOpen] = useState(false)
  const [nestedData, setNestedData] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editableFormData, setEditableFormData] = useState({})
  const [editablePrimaryValue, setEditablePrimaryValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [currentRecordId, setCurrentRecordId] = useState(null)
  const [currentColumnId, setCurrentColumnId] = useState(null)

  // Fetch columns and records on component mount
  useEffect(() => {
    if (table?.table_id) {
      fetchTableData()
    }
  }, [table?.table_id])

  const fetchTableData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [columnsResponse, recordsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/datatables/${table.table_id}/columns`, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          }
        }),
        axios.get(`${API_BASE_URL}/api/records/${table.table_id}`, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          }
        })
      ])

      const columnsData = columnsResponse.data
      const recordsData = recordsResponse.data
      
      console.log('Columns data:', columnsData)
      console.log('Records data:', recordsData)
      
      // Debug: Show column to field mapping
      if (columnsData.length > 0 && recordsData.length > 0) {
        console.log('Column to Field Mapping:')
        columnsData.forEach(column => {
          console.log(`Column: ${column.column_name} (${column.column_id})`)
          const sampleRecord = recordsData.find(r => r.field_values && r.field_values[column.column_id])
          if (sampleRecord) {
            console.log(`  Sample value: ${sampleRecord.field_values[column.column_id]}`)
          } else {
            console.log(`  No data found for this column`)
          }
        })
      }
      
      setColumns(columnsData)
      setRecords(recordsData)
      toast.success(`Loaded ${recordsData.length} records successfully!`)
      
    } catch (err) {
      const errorMsg = `Failed to fetch table data: ${err.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error fetching table data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecord = async (recordId) => {
    setLoading(true)
    
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/records/${table.table_id}/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        }
      })

      toast.success("Record deleted successfully!")
      setIsDeleteDialogOpen(false)
      setRecordToDelete(null)
      fetchTableData()
      
    } catch (err) {
      toast.error(`Failed to delete record: ${err.message}`)
      console.error("Error deleting record:", err)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get field value for a column
  const getFieldValue = (record, columnId) => {
    if (!record.field_values) return null
    
    return record.field_values[columnId] || null
  }

  // Helper function to check if column has nested data
  const hasNestedData = (column) => {
    if (!column.optional_values || column.optional_values.length === 0) {
      console.log(`Column ${column.column_name}: No optional_values`)
      return false
    }
    try {
      const options = JSON.parse(column.optional_values[0])
      const hasNested = options.some(option => option.nestedFields && option.nestedFields.length > 0)
      console.log(`Column ${column.column_name}: hasNestedData = ${hasNested}`)
      return hasNested
    } catch (error) {
      console.log(`Column ${column.column_name}: Error parsing optional_values:`, error)
      return false
    }
  }

  // Helper function to parse nested field values and structure
  const parseNestedData = (fieldValue, column) => {
    try {
      const parsed = JSON.parse(fieldValue)
      const options = JSON.parse(column.optional_values[0])
      
      const result = {
        columnName: column.column_name,
        selectedValue: parsed.value,
        options: options, // Store all options for form building
        formData: {} // Store the filled form data
      }

      // Recursively extract form data from nested values
      const extractFormData = (nestedValues, parentFields) => {
        const formData = {}
        
        if (!nestedValues || typeof nestedValues !== 'object') return formData

        Object.entries(nestedValues).forEach(([fieldId, fieldData]) => {
          // Find the field definition
          const fieldDef = parentFields?.find(f => f.id === fieldId)
          
          if (!fieldDef) return
          
          // Handle object with value and nestedValues
          if (typeof fieldData === 'object' && fieldData.value !== undefined) {
            // Find the nested fields for the selected option
            let nestedFields = []
            if (fieldDef.options) {
              const selectedOption = fieldDef.options.find(
                opt => opt.value === fieldData.value || opt.label === fieldData.value
              )
              nestedFields = selectedOption?.nestedFields || []
            }
            
            formData[fieldId] = {
              fieldDef: fieldDef,
              value: fieldData.value,
              nestedData: fieldData.nestedValues 
                ? extractFormData(fieldData.nestedValues, nestedFields) 
                : {}
            }
          } 
          // Handle direct value (like {value: "door"} without nestedValues)
          else if (typeof fieldData === 'object') {
            // Check if it's a simple object with just a value
            const keys = Object.keys(fieldData)
            if (keys.length === 1 && keys[0] === 'value') {
              formData[fieldId] = {
                fieldDef: fieldDef,
                value: fieldData.value,
                nestedData: {}
              }
            }
          }
          // Handle plain string/number values
          else {
            formData[fieldId] = {
              fieldDef: fieldDef,
              value: fieldData,
              nestedData: {}
            }
          }
        })
        
        return formData
      }

      // Start extracting from the root level
      if (parsed.nestedValues) {
        // Find the selected option
        const selectedOption = options.find(opt => opt.value === parsed.value || opt.label === parsed.value)
        if (selectedOption && selectedOption.nestedFields) {
          result.formData = extractFormData(parsed.nestedValues, selectedOption.nestedFields)
        }
      }

      return result
    } catch (error) {
      console.error('Error parsing nested data:', error)
      return null
    }
  }

  // Function to open nested data modal
  const openNestedModal = (fieldValue, column, recordId) => {
    const nestedData = parseNestedData(fieldValue, column)
    if (nestedData) {
      setNestedData(nestedData)
      setEditableFormData(JSON.parse(JSON.stringify(nestedData.formData))) // Deep clone
      setEditablePrimaryValue(nestedData.selectedValue)
      setCurrentRecordId(recordId)
      setCurrentColumnId(column.column_id)
      setIsEditMode(false)
      setIsNestedModalOpen(true)
    }
  }

  // Helper function to format field value based on data type
  const formatFieldValue = (value, dataType, column = null, record = null) => {

    console.log('formatFieldValue ::', value, column)
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">-</span>
    }

    // Check if this is nested data that should open a modal
    if (dataType === 'text' && typeof value === 'string' && value.trim().startsWith('{')) {
      console.log(`Processing JSON value for column ${column?.column_name}:`, value)
      try {
        const parsed = JSON.parse(value)
        console.log(`Parsed JSON:`, parsed)
        // Only show modal if this looks like nested data AND column has nested capability
        if (parsed.value && parsed.nestedValues && column && hasNestedData(column)) {
          console.log(`Column ${column.column_name} has nested data capability`)
          if (Object.keys(parsed.nestedValues).length > 0) {
            console.log(`Showing modal for ${column.column_name}`)
            return (
              <button
                onClick={() => openNestedModal(value, column, record?.record_id)}
                className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer px-2 py-1 rounded border border-blue-300 text-sm font-medium"
                title="Click to view/edit nested data"
              >
                {Array.isArray(parsed.value) ? parsed.value.join(' → ') : parsed.value}
                <span className="ml-1 text-xs">📋</span>
              </button>
            )
          } else {
            console.log(`Empty nestedValues for ${column.column_name}, showing normal text`)
            // If nestedValues is empty, render normally without modal
            return (
              <span className="truncate max-w-[200px]">
                {Array.isArray(parsed.value) ? parsed.value.join(' → ') : parsed.value}
              </span>
            )
          }
        } else {
          console.log(`Not showing modal for ${column?.column_name}:`, {
            hasValue: !!parsed.value,
            hasNestedValues: !!parsed.nestedValues,
            hasColumn: !!column,
            hasNestedCapability: column ? hasNestedData(column) : false
          })
        }
      } catch (error) {
        console.log(`Error parsing JSON for ${column?.column_name}:`, error)
        // If parsing fails, fall through to default handling
      }
    }

    switch (dataType) {
      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        )
      case 'phone':
        try {
          const phoneData = JSON.parse(value)
          return (
            <div className="text-sm">
              <div className="font-medium">{phoneData.number}</div>
              <div className="text-xs text-muted-foreground">{phoneData.country}</div>
            </div>
          )
        } catch {
          return (
            <a href={`tel:${value}`} className="text-blue-600 hover:underline">
              {value}
            </a>
          )
        }
      case 'boolean':
        return (
          <Badge variant={value === 'true' || value === true ? 'default' : 'secondary'}>
            {value === 'true' || value === true ? 'Yes' : 'No'}
          </Badge>
        )
      case 'date':
        try {
          return new Date(value).toLocaleDateString()
        } catch {
          return <span className="truncate max-w-[200px]">{value}</span>
        }
      case 'datetime':
        try {
          return new Date(value).toLocaleString()
        } catch {
          return <span className="truncate max-w-[200px]">{value}</span>
        }
      case 'select':
        return <span className="truncate max-w-[200px]">{value}</span>
      case 'location':
        try {
          const locationData = JSON.parse(value)
          return (
            <div className="text-sm">
              <div className="font-medium">{locationData.address || locationData.name}</div>
              <div className="text-xs text-muted-foreground">
                {locationData.city}, {locationData.country}
              </div>
            </div>
          )
        } catch {
          return <span className="truncate max-w-[200px]">{value}</span>
        }
      default:
        return <span className="truncate max-w-[200px]">{value}</span>
    }
  }

  // Function to convert editableFormData back to API format
  const convertFormDataToAPIFormat = (formData) => {
    const result = {
      nestedValues: {}
    }
    
    const processLevel = (data) => {
      const levelData = {}
      
      Object.entries(data).forEach(([fieldId, fieldInfo]) => {
        if (fieldInfo.value) {
          levelData[fieldId] = {
            value: fieldInfo.value
          }
          
          if (fieldInfo.nestedData && Object.keys(fieldInfo.nestedData).length > 0) {
            levelData[fieldId].nestedValues = processLevel(fieldInfo.nestedData)
          } else {
            levelData[fieldId].nestedValues = {}
          }
        }
      })
      
      return levelData
    }
    
    result.nestedValues = processLevel(formData)
    result.value = editablePrimaryValue // Use editable primary value instead
    
    return result
  }

  // Function to save nested data
  const handleSaveNestedData = async () => {
    try {
      setIsSaving(true)
      
      // Convert form data to API format
      const apiData = convertFormDataToAPIFormat(editableFormData)
      const fieldValueString = JSON.stringify(apiData)
      
      // Prepare the update payload
      const payload = {
        field_values: {
          [currentColumnId]: fieldValueString
        }
      }
      
      console.log('Saving nested data:', payload)
      console.log('API URL:', `${API_BASE_URL}/api/records/${table.table_id}/${currentRecordId}/nested`)
      
      // Call the API with /nested endpoint
      const response = await axios.put(
        `${API_BASE_URL}/api/records/${table.table_id}/${currentRecordId}/nested`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (response.data) {
        toast.success('Record updated successfully!')
        setIsEditMode(false)
        setIsNestedModalOpen(false)
        // Refresh the table data
        await fetchTableData()
      }
    } catch (error) {
      console.log('Error saving nested data:', error)
      toast.error(error.response?.data?.message || 'Failed to update record')
    } finally {
      setIsSaving(false)
    }
  }

  // Function to handle primary value change
  const handlePrimaryValueChange = (newValue) => {
    setEditablePrimaryValue(newValue)
    // Clear all nested data when primary selection changes
    setEditableFormData({})
    
    // If there's a new value, initialize nested fields for it
    if (newValue && nestedData.options) {
      const selectedOption = nestedData.options.find(opt => opt.value === newValue || opt.label === newValue)
      if (selectedOption && selectedOption.nestedFields) {
        const newFormData = {}
        selectedOption.nestedFields.forEach(field => {
          newFormData[field.id] = {
            fieldDef: field,
            value: '',
            nestedData: {}
          }
        })
        setEditableFormData(newFormData)
      }
    }
  }

  // Function to handle field value change
  const handleFieldChange = (fieldId, newValue, path = []) => {
    setEditableFormData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData)) // Deep clone
      
      // Navigate to the correct nested level
      let current = newData
      for (const pathItem of path) {
        if (current[pathItem]) {
          current = current[pathItem].nestedData
        }
      }
      
      if (current[fieldId]) {
        current[fieldId].value = newValue
        
        // Clear nested data if value changes (user selected different option)
        if (current[fieldId].fieldDef.hasNested) {
          current[fieldId].nestedData = {}
        }
      }
      
      return newData
    })
  }

  // Recursive component to render nested form fields
  const renderNestedFormFields = (formData, level = 0, path = []) => {
    if (!formData || Object.keys(formData).length === 0) return null

    return (
      <div className={`space-y-4 ${level > 0 ? 'ml-6 pl-4 border-l-2 border-primary/20' : ''}`}>
        {Object.entries(formData).map(([fieldId, fieldInfo]) => {
          const { fieldDef, value, nestedData } = fieldInfo
          const currentPath = [...path, fieldId]
          
          return (
            <div key={fieldId} className="space-y-2">
              {/* Field Label */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  {fieldDef.label}
                  {fieldDef.required && <span className="text-destructive ml-1">*</span>}
                </label>
                <Badge variant="outline" className="text-xs">
                  {fieldDef.type}
                </Badge>
              </div>

              {/* Field Value Based on Type */}
              {fieldDef.type === 'select' && (
                <select
                  value={value || ''}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value, path)}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border rounded-md text-sm ${
                    isEditMode 
                      ? 'bg-background border-input hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer' 
                      : 'bg-muted/50 cursor-not-allowed'
                  }`}
                >
                  <option value="">Select {fieldDef.label}</option>
                  {fieldDef.options?.map((option, idx) => (
                    <option key={idx} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {fieldDef.type === 'text' && (
                <Input
                  value={value || ''}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value, path)}
                  readOnly={!isEditMode}
                  className={isEditMode ? 'bg-background' : 'bg-muted/50 cursor-not-allowed'}
                  placeholder={`Enter ${fieldDef.label}`}
                />
              )}

              {fieldDef.type === 'radio' && (
                <div className="space-y-2">
                  {fieldDef.options?.map((option, idx) => (
                    <div
                      key={idx}
                      onClick={() => isEditMode && handleFieldChange(fieldId, option.value, path)}
                      className={`flex items-center gap-2 p-3 rounded-md border ${
                        isEditMode ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed bg-muted/30'
                      }`}
                    >
                      <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center">
                        {value === option.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {fieldDef.type === 'checkbox' && (
                <div className="space-y-2">
                  {fieldDef.options?.map((option, idx) => {
                    const isChecked = Array.isArray(value) ? value.includes(option.value) : value === option.value
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isEditMode) {
                            let newValue
                            if (Array.isArray(value)) {
                              newValue = isChecked
                                ? value.filter(v => v !== option.value)
                                : [...value, option.value]
                            } else {
                              newValue = [option.value]
                            }
                            handleFieldChange(fieldId, newValue, path)
                          }
                        }}
                        className={`flex items-center gap-2 p-3 rounded-md border ${
                          isEditMode ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed bg-muted/30'
                        }`}
                      >
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                          isChecked ? 'bg-primary border-primary' : 'border-muted-foreground'
                        }`}>
                          {isChecked && (
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{option.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Render nested fields recursively if value is selected and has nested fields */}
              {value && fieldDef.hasNested && fieldDef.options && (
                (() => {
                  const selectedOption = fieldDef.options.find(opt => opt.value === value || opt.label === value)
                  if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
                    // Show nested fields from the selected option
                    const nestedFieldsToShow = {}
                    selectedOption.nestedFields.forEach(nestedField => {
                      if (nestedData && nestedData[nestedField.id]) {
                        nestedFieldsToShow[nestedField.id] = nestedData[nestedField.id]
                      } else if (isEditMode) {
                        // Create empty field structure for edit mode
                        nestedFieldsToShow[nestedField.id] = {
                          fieldDef: nestedField,
                          value: '',
                          nestedData: {}
                        }
                      }
                    })
                    
                    if (Object.keys(nestedFieldsToShow).length > 0) {
                      return (
                        <Card className="mt-3 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                          <CardHeader className="pb-3 px-4 pt-3">
                            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                              <span className="h-1 w-1 rounded-full bg-primary"></span>
                              Nested Fields for: {value}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4">
                            {renderNestedFormFields(nestedFieldsToShow, level + 1, currentPath)}
                          </CardContent>
                        </Card>
                      )
                    }
                  }
                  return null
                })()
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Filter records based on search term
  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    
    // Search in field values
    if (record.field_values) {
      const fieldValues = Object.values(record.field_values)
      if (fieldValues.some(value => 
        value && String(value).toLowerCase().includes(searchLower)
      )) {
        return true
      }
    }
    
    // Search in record ID
    if (record.record_id && record.record_id.toLowerCase().includes(searchLower)) {
      return true
    }
    
    return false
  })

  // Create dynamic columns based on API response
  const createDynamicColumns = () => {
    if (!columns.length) return []
  
    const dynamicColumns = columns.map((column) => ({
      accessorKey: column.column_id,
      header: column.column_name,
      cell: ({ row }) => {
        const record = row.original
        // Get field value using helper function
        const fieldValue = getFieldValue(record, column.column_id)
        
        // Format field value using helper function
        return formatFieldValue(fieldValue, column.data_type, column, record)
      },
    }))

    // Add metadata columns
    const metadataColumns = [
      {
        accessorKey: "record_id",
        header: "Record ID",
        cell: ({ row }) => {
          const recordId = row.getValue("record_id")
          return (
            <div className="font-mono text-xs bg-muted/50 px-2 py-1 rounded-md border">
              {String(recordId).slice(0, 8)}...
            </div>
          )
        },
      },
      {
        accessorKey: "created_at",
        header: "Created At",
        cell: ({ row }) => {
          const date = new Date(row.getValue("created_at"))
          return (
            <div className="text-sm">
              <div className="font-medium text-foreground">
                {date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {date.toLocaleTimeString('en-US', {
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
          const record = row.original
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary/10"
                title="View record"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary/10"
                title="Edit record"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-destructive/10"
                    title="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuItem className="cursor-pointer">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Record
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Record Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      setRecordToDelete(record)
                      setIsDeleteDialogOpen(true)
                    }}
                    className="text-destructive cursor-pointer focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Record
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ]

    return [...dynamicColumns, ...metadataColumns]
  }

  const formatValue = (value, dataType) => {
    if (value === null || value === undefined || value === "") return "-"
    
    switch (dataType) {
      case "date":
        return new Date(value).toLocaleDateString()
      case "datetime":
        return new Date(value).toLocaleString()
      case "boolean":
        return value ? "Yes" : "No"
      case "email":
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        )
      case "phone":
        return (
          <a href={`tel:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        )
      default:
        return String(value)
    }
  }

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading table data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tables
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              {table?.table_name}
            </h1>
            <p className="text-muted-foreground">
              {table?.description || "Table data view"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchTableData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Record
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
              <Button variant="outline" size="sm" onClick={fetchTableData} className="ml-2">
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
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Columns</p>
                <p className="text-2xl font-bold">{columns.length}</p>
              </div>
              <Settings className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Data</p>
                <p className="text-2xl font-bold">
                  {records.filter(r => r.field_values && Object.keys(r.field_values).length > 0).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Empty Records</p>
                <p className="text-2xl font-bold">
                  {records.filter(r => !r.field_values || Object.keys(r.field_values).length === 0).length}
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
              <CardTitle className="text-lg">Table Records</CardTitle>
              <p className="text-sm text-muted-foreground">
                {records.length} record{records.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {records.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Custom Search Input */}
          <div className="flex items-center py-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <DataTable 
            columns={createDynamicColumns()} 
            data={filteredRecords} 
            searchKey=""
            searchPlaceholder=""
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? 
              This action cannot be undone and will permanently remove the record data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteRecord(recordToDelete?.record_id)}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Data Modal */}
      <Dialog open={isNestedModalOpen} onOpenChange={setIsNestedModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Nested Data - {nestedData?.columnName}</DialogTitle>
            <DialogDescription>
              Detailed view of nested field values for this column
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {nestedData && (
              <div className="space-y-6">
                {/* Root Selected Value */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border-l-4 border-primary">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-muted-foreground">Primary Selection</h4>
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    {!isEditMode ? (
                      <Badge variant="default" className="text-base px-4 py-1">
                        {editablePrimaryValue}
                      </Badge>
                    ) : (
                      <select
                        value={editablePrimaryValue || ''}
                        onChange={(e) => handlePrimaryValueChange(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md text-sm bg-background border-input hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                      >
                        <option value="">Select primary value</option>
                        {nestedData.options?.map((option, idx) => (
                          <option key={idx} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Nested Form Fields */}
                {Object.keys(editableFormData).length > 0 && editablePrimaryValue && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h4 className="font-semibold text-base text-foreground">Nested Form Fields</h4>
                      <Badge variant="secondary" className="text-xs">
                        {Object.keys(editableFormData).length} fields
                      </Badge>
                    </div>
                    <div className="space-y-4 pb-4">
                      {renderNestedFormFields(editableFormData)}
                    </div>
                  </div>
                )}

                {/* No nested data message */}
                {(!editablePrimaryValue || Object.keys(editableFormData).length === 0) && editablePrimaryValue && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No nested fields available for this selection</p>
                  </div>
                )}
                
                {/* Prompt to select primary value in edit mode */}
                {!editablePrimaryValue && isEditMode && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Please select a primary value above to see nested fields</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-4">
            <div className="flex-1">
              {isEditMode && (
                <Badge variant="secondary" className="text-xs">
                  <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>
                  Edit Mode
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {!isEditMode ? (
                <>
                  <Button variant="outline" onClick={() => setIsNestedModalOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => setIsEditMode(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditMode(false)
                      setEditableFormData(JSON.parse(JSON.stringify(nestedData.formData)))
                      setEditablePrimaryValue(nestedData.selectedValue)
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveNestedData}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
