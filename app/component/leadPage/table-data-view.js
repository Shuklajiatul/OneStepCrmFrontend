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
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYxODA3MTc0LCJleHAiOjE3NjE4OTM1NzR9.veM_dzvXFYL1N_g-XErj0T9PiIjP8sUafknPKogkuH0'

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

  // Helper function to check if column has nested data or is a modal-editable type
  const hasNestedData = (column) => {
    // Select, radio, and checkbox should always show modal (even without nested fields)
    const modalEditableTypes = ['select', 'radio', 'checkbox']
    const parentDatatype = column.parent_datatype
    
    if (parentDatatype && !modalEditableTypes.includes(parentDatatype)) {
      console.log(`Column ${column.column_name}: parent_datatype "${parentDatatype}" is not modal-editable (use Actions Edit instead)`)
      return false
    }
    
    if (!column.optional_values || column.optional_values.length === 0) {
      console.log(`Column ${column.column_name}: No optional_values`)
      return false
    }
    
    // For select, radio, checkbox: return true if it has options (even if no nested fields)
    try {
      const options = JSON.parse(column.optional_values[0])
      const hasOptions = Array.isArray(options) && options.length > 0
      console.log(`Column ${column.column_name}: parent_datatype="${parentDatatype}", hasOptions=${hasOptions}`)
      return hasOptions
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
      
      // Check if parsed is an array (root array structure like uber2)
      const isMulti = Array.isArray(parsed)
      
      console.log(`[parseNestedData] Column: ${column.column_name}`)
      console.log(`[parseNestedData] isMulti: ${isMulti}`)
      console.log(`[parseNestedData] parsed:`, parsed)
      console.log(`[parseNestedData] options:`, options)
      
      const result = {
        columnName: column.column_name,
        isMulti: isMulti,
        selectedValue: isMulti ? parsed.map(item => item.value) : parsed.value,
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
          
          // Handle array (multi-checkbox case where field value is an array of objects)
          if (Array.isArray(fieldData)) {
            console.log(`[extractFormData] Found array field: ${fieldId}`, fieldData)
            
            // Store array values with nested data
            const arrayValue = fieldData.map(item => item.value)
            
            // Extract nested data from each array item
            const arrayNestedData = {}
            fieldData.forEach((item, index) => {
              if (item.nestedValues && Object.keys(item.nestedValues).length > 0) {
                // Find nested fields for this option
                let nestedFields = []
                if (fieldDef.options) {
                  const selectedOption = fieldDef.options.find(
                    opt => opt.value === item.value || opt.label === item.value
                  )
                  nestedFields = selectedOption?.nestedFields || []
                }
                
                // Extract nested data with index prefix
                if (nestedFields.length > 0) {
                  const itemNestedData = extractFormData(item.nestedValues, nestedFields)
                  Object.entries(itemNestedData).forEach(([nestedFieldId, nestedFieldInfo]) => {
                    arrayNestedData[`${index}_${nestedFieldId}`] = {
                      ...nestedFieldInfo,
                      _arrayIndex: index,
                      _arrayValue: item.value,
                      _originalFieldId: nestedFieldId
                    }
                  })
                }
              }
            })
            
            formData[fieldId] = {
              fieldDef: fieldDef,
              value: arrayValue, // Array of selected values
              nestedData: arrayNestedData,
              _isArray: true // Mark this as an array field
            }
          }
          // Handle object with value and nestedValues
          else if (typeof fieldData === 'object' && fieldData.value !== undefined) {
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

      // Handle root array structure (multiple selections)
      if (isMulti) {
        console.log(`[parseNestedData] Processing multi-select with ${parsed.length} items`)
        // For multi-select, we need to merge nested fields from all selected items
        // Process each item in the array
        parsed.forEach((item, index) => {
          console.log(`[parseNestedData] Item ${index}:`, item)
          const selectedOption = options.find(opt => opt.value === item.value || opt.label === item.value)
          console.log(`[parseNestedData] Selected option for "${item.value}":`, selectedOption)
          
          if (selectedOption) {
            // Check if there are nested fields defined for this option
            if (selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
              // Extract form data from nestedValues (even if empty)
              const itemFormData = item.nestedValues && Object.keys(item.nestedValues).length > 0
                ? extractFormData(item.nestedValues, selectedOption.nestedFields)
                : {}
              
              console.log(`[parseNestedData] Item ${index} formData:`, itemFormData)
              console.log(`[parseNestedData] Item ${index} has ${Object.keys(itemFormData).length} fields`)
              
              // If there's form data, add it with prefixes
              if (Object.keys(itemFormData).length > 0) {
                Object.entries(itemFormData).forEach(([fieldId, fieldInfo]) => {
                  const prefixedFieldId = `${index}_${fieldId}`
                  result.formData[prefixedFieldId] = {
                    ...fieldInfo,
                    _originalFieldId: fieldId,
                    _selectionIndex: index,
                    _selectionValue: item.value
                  }
                  console.log(`[parseNestedData] Added field: ${prefixedFieldId}`)
                })
              } else {
                // Even if there's no data, create placeholder entries for nested fields in edit mode
                // This ensures the fields show up when editing
                console.log(`[parseNestedData] No form data, creating placeholders for ${selectedOption.nestedFields.length} fields`)
                selectedOption.nestedFields.forEach(field => {
                  const prefixedFieldId = `${index}_${field.id}`
                  result.formData[prefixedFieldId] = {
                    fieldDef: field,
                    value: '',
                    nestedData: {},
                    _originalFieldId: field.id,
                    _selectionIndex: index,
                    _selectionValue: item.value
                  }
                  console.log(`[parseNestedData] Added placeholder field: ${prefixedFieldId}`)
                })
              }
            } else {
              // No nested fields for this option - create a marker entry
              console.log(`[parseNestedData] No nested fields for option "${item.value}", creating empty marker`)
              result.formData[`${index}_empty`] = {
                _selectionIndex: index,
                _selectionValue: item.value,
                _isEmpty: true
              }
            }
          }
        })
        console.log(`[parseNestedData] Final formData:`, result.formData)
      } else {
        // Handle single selection (original behavior)
        if (parsed.nestedValues) {
          // Find the selected option
          const selectedOption = options.find(opt => opt.value === parsed.value || opt.label === parsed.value)
          if (selectedOption && selectedOption.nestedFields) {
            result.formData = extractFormData(parsed.nestedValues, selectedOption.nestedFields)
          }
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

    // First, handle simple JSON wrapped values (like {"value": "something"})
    // This applies to all data types, not just nested data
    let parsedValue = null
    if (typeof value === 'string' && value.trim().startsWith('{')) {
      try {
        parsedValue = JSON.parse(value)
        
        // Extract simple value wrapper for text, textarea, number, email fields
        if (parsedValue.value !== undefined && !parsedValue.nestedValues && !parsedValue.countryCode && !parsedValue.country && !parsedValue.state && !parsedValue.city) {
          value = parsedValue.value
          parsedValue = null // Clear parsed value since we extracted the simple value
        }
      } catch (error) {
        // Not JSON, continue with original value
        console.log(`Not JSON: ${value}`)
        parsedValue = null
      }
    }

    // Check if this is nested data that should open a modal
    // Handle both single object {value:..., nestedValues:...} and array [{value:..., nestedValues:...}, ...]
    if (dataType === 'text' && typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
      console.log(`Processing JSON value for column ${column?.column_name}:`, value)
      try {
        const parsed = JSON.parse(value)
        console.log(`Parsed JSON:`, parsed)
        
        // Check if this is an array (multi-select)
        const isMulti = Array.isArray(parsed)
        
        // For multi-select: check if any item has nested data
        // For single: check if it has nested data structure
        let hasNestedStructure = false
        let displayValue = null
        
        if (isMulti) {
          // Multi-select case
          hasNestedStructure = parsed.some(item => item.value !== undefined && item.nestedValues !== undefined)
          displayValue = parsed.map(item => item.value).join(' → ')
        } else {
          // Single select case
          hasNestedStructure = parsed.value !== undefined && parsed.nestedValues !== undefined
          displayValue = Array.isArray(parsed.value) ? parsed.value.join(' → ') : parsed.value
        }
        
        // Only show modal if this looks like nested data AND column has nested capability
        if (hasNestedStructure && column && hasNestedData(column)) {
          console.log(`Column ${column.column_name} has nested data capability`)
          
          // Show modal button if the nestedValues key exists (even if empty)
          // This is because the presence of nestedValues indicates it's a structured field
          console.log(`Showing modal for ${column.column_name} (has nestedValues structure)`)
          return (
            <button
              onClick={() => openNestedModal(value, column, record?.record_id)}
              className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer px-2 py-1 rounded border border-blue-300 text-sm font-medium"
              title="Click to view/edit nested data"
            >
              {displayValue}
              <span className="ml-1 text-xs">📋</span>
            </button>
          )
        } else {
          console.log(`Not showing modal for ${column?.column_name}:`, {
            hasNestedStructure,
            hasColumn: !!column,
            hasNestedCapability: column ? hasNestedData(column) : false
          })
          
          // If it's a simple JSON structure, render the value normally
          // This includes:
          // - {"value":"sim"} - no nestedValues property
          // - {"value":"Sel2","nestedValues":{}} - has nestedValues but column has no nested capability
          if (!isMulti && parsed.value !== undefined) {
            return (
              <span className="truncate max-w-[200px]">
                {Array.isArray(parsed.value) ? parsed.value.join(' → ') : parsed.value}
              </span>
            )
          }
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
          const phoneData = parsedValue || JSON.parse(value)
          if (phoneData.countryCode && phoneData.number) {
            return (
              <div className="text-sm">
                <div className="font-medium">{phoneData.countryCode} {phoneData.number}</div>
              </div>
            )
          }
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
      case 'textarea':
        return <span className="truncate max-w-[200px]">{value}</span>
      case 'text':
        return <span className="truncate max-w-[200px]">{value}</span>
      case 'number':
        return <span className="truncate max-w-[200px]">{value}</span>
      case 'select':
        return <span className="truncate max-w-[200px]">{value}</span>
      case 'location':
        try {
          const locationData = parsedValue || JSON.parse(value)
          return (
            <div className="text-sm">
              {locationData.address || locationData.name ? (
                <div className="font-medium">{locationData.address || locationData.name}</div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                {[locationData.city, locationData.state, locationData.country].filter(Boolean).join(', ')}
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
    // Check if this is multi-select data
    if (nestedData?.isMulti) {
      // For multi-select, return an array
      const result = []
      
      // Group formData by selection index
      const groupedBySelection = {}
      Object.entries(formData).forEach(([fieldId, fieldInfo]) => {
        if (fieldInfo._selectionIndex !== undefined) {
          if (!groupedBySelection[fieldInfo._selectionIndex]) {
            groupedBySelection[fieldInfo._selectionIndex] = {
              value: fieldInfo._selectionValue,
              items: {},
              isEmpty: false
            }
          }
          // Skip empty marker entries
          if (fieldInfo._isEmpty) {
            groupedBySelection[fieldInfo._selectionIndex].isEmpty = true
          } else if (fieldInfo._originalFieldId) {
            groupedBySelection[fieldInfo._selectionIndex].items[fieldInfo._originalFieldId] = fieldInfo
          }
        }
      })
      
      // Process each selection group
      Object.keys(groupedBySelection).sort().forEach(index => {
        const group = groupedBySelection[index]
        const item = {
          value: group.value,
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
        
        item.nestedValues = processLevel(group.items)
        result.push(item)
      })
      
      return result
    } else {
      // For single selection, return an object
      const result = {
        nestedValues: {}
      }
      
      const processLevel = (data) => {
        const levelData = {}
        
        Object.entries(data).forEach(([fieldId, fieldInfo]) => {
          if (fieldInfo.value) {
            // Handle array fields (checkboxes with nested data)
            if (fieldInfo._isArray && Array.isArray(fieldInfo.value)) {
              const arrayResult = []
              
              // Group nested data by array index
              const groupedByIndex = {}
              if (fieldInfo.nestedData) {
                Object.entries(fieldInfo.nestedData).forEach(([nestedFieldId, nestedFieldInfo]) => {
                  const arrayIndex = nestedFieldInfo._arrayIndex
                  if (arrayIndex !== undefined) {
                    if (!groupedByIndex[arrayIndex]) {
                      groupedByIndex[arrayIndex] = {
                        value: nestedFieldInfo._arrayValue,
                        items: {}
                      }
                    }
                    if (nestedFieldInfo._originalFieldId) {
                      groupedByIndex[arrayIndex].items[nestedFieldInfo._originalFieldId] = nestedFieldInfo
                    }
                  }
                })
              }
              
              // Convert each array item back to API format
              fieldInfo.value.forEach((val, idx) => {
                const item = {
                  value: val,
                  nestedValues: {}
                }
                
                if (groupedByIndex[idx] && Object.keys(groupedByIndex[idx].items).length > 0) {
                  item.nestedValues = processLevel(groupedByIndex[idx].items)
                }
                
                arrayResult.push(item)
              })
              
              levelData[fieldId] = arrayResult
            }
            // Handle regular fields
            else {
              levelData[fieldId] = {
                value: fieldInfo.value
              }
              
              if (fieldInfo.nestedData && Object.keys(fieldInfo.nestedData).length > 0) {
                levelData[fieldId].nestedValues = processLevel(fieldInfo.nestedData)
              } else {
                levelData[fieldId].nestedValues = {}
              }
            }
          }
        })
        
        return levelData
      }
      
      result.nestedValues = processLevel(formData)
      result.value = editablePrimaryValue // Use editable primary value instead
      
      return result
    }
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
    console.log('[handlePrimaryValueChange] New value:', newValue)
    setEditablePrimaryValue(newValue)
    
    // Initialize nested fields based on the new selection(s)
    if (newValue && nestedData.options) {
      // Handle array values (checkbox/multi-select)
      if (Array.isArray(newValue)) {
        console.log('[handlePrimaryValueChange] Handling array value (checkboxes)')
        
        setEditableFormData(prevFormData => {
          const newFormData = {}
          
          // Build a map of existing data by selection value (not by index)
          const existingDataByValue = {}
          Object.entries(prevFormData).forEach(([fieldId, fieldInfo]) => {
            const selectionValue = fieldInfo._selectionValue
            if (selectionValue) {
              if (!existingDataByValue[selectionValue]) {
                existingDataByValue[selectionValue] = {}
              }
              const originalFieldId = fieldInfo._originalFieldId || fieldId.split('_').slice(1).join('_')
              existingDataByValue[selectionValue][originalFieldId] = fieldInfo
            }
          })
          
          console.log('[handlePrimaryValueChange] Existing data by value:', Object.keys(existingDataByValue))
          
          // Rebuild form data with new indices, preserving existing values
          newValue.forEach((selectedValue, index) => {
            const selectedOption = nestedData.options.find(
              opt => opt.value === selectedValue || opt.label === selectedValue
            )
            
            if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
              console.log(`[handlePrimaryValueChange] Processing selection ${index}: ${selectedValue}`)
              
              // Check if we have existing data for this value
              const existingForThisValue = existingDataByValue[selectedValue]
              
              selectedOption.nestedFields.forEach(field => {
                const prefixedFieldId = `${index}_${field.id}`
                
                // Try to preserve existing data for this field
                if (existingForThisValue && existingForThisValue[field.id]) {
                  console.log(`[handlePrimaryValueChange] Preserving data for ${selectedValue}.${field.id}`)
                  newFormData[prefixedFieldId] = {
                    ...existingForThisValue[field.id],
                    _selectionIndex: index, // Update index
                    _selectionValue: selectedValue
                  }
                } else {
                  // Initialize new empty field
                  console.log(`[handlePrimaryValueChange] Initializing new field for ${selectedValue}.${field.id}`)
                  newFormData[prefixedFieldId] = {
                    fieldDef: field,
                    value: '',
                    nestedData: {},
                    _originalFieldId: field.id,
                    _selectionIndex: index,
                    _selectionValue: selectedValue
                  }
                }
              })
            } else if (selectedOption) {
              // No nested fields - create empty marker
              newFormData[`${index}_empty`] = {
                _selectionIndex: index,
                _selectionValue: selectedValue,
                _isEmpty: true
              }
            }
          })
          
          console.log('[handlePrimaryValueChange] Final form data with keys:', Object.keys(newFormData))
          return newFormData
        })
      } 
      // Handle single value (select/radio)
      else {
        console.log('[handlePrimaryValueChange] Handling single value')
        const selectedOption = nestedData.options.find(
          opt => opt.value === newValue || opt.label === newValue
        )
        
        if (selectedOption && selectedOption.nestedFields) {
          const newFormData = {}
          selectedOption.nestedFields.forEach(field => {
            newFormData[field.id] = {
              fieldDef: field,
              value: '',
              nestedData: {}
            }
          })
          console.log('[handlePrimaryValueChange] Set form data with keys:', Object.keys(newFormData))
          setEditableFormData(newFormData)
        } else {
          setEditableFormData({})
        }
      }
    } else {
      // No value selected, clear form data
      setEditableFormData({})
    }
  }

  // Function to handle field value change
  const handleFieldChange = (fieldId, newValue, path = []) => {
    console.log('[handleFieldChange] Called with:', { fieldId, newValue, path })
    
    setEditableFormData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData)) // Deep clone
      
      console.log('[handleFieldChange] prevData:', prevData)
      console.log('[handleFieldChange] Starting navigation with path:', path)
      
      // Navigate to the correct nested level
      let current = newData
      for (let i = 0; i < path.length; i++) {
        const pathItem = path[i]
        console.log(`[handleFieldChange] Step ${i}: Looking for ${pathItem} in:`, Object.keys(current))
        
        if (current[pathItem]) {
          console.log(`[handleFieldChange] Found ${pathItem}, navigating to its nestedData`)
          console.log(`[handleFieldChange] nestedData exists:`, !!current[pathItem].nestedData)
          
          if (!current[pathItem].nestedData) {
            console.warn(`[handleFieldChange] nestedData missing for ${pathItem}, creating empty object`)
            current[pathItem].nestedData = {}
          }
          
          current = current[pathItem].nestedData
        } else {
          console.error(`[handleFieldChange] Path item ${pathItem} not found!`)
          return prevData // Return unchanged
        }
      }
      
      console.log('[handleFieldChange] After navigation, current level has keys:', Object.keys(current))
      console.log('[handleFieldChange] Looking for field:', fieldId)
      
      if (current[fieldId]) {
        const oldValue = current[fieldId].value
        console.log(`[handleFieldChange] Found field ${fieldId}, updating value from "${oldValue}" to "${newValue}"`)
        current[fieldId].value = newValue
        
        // If field has nested data and value changed, initialize nested structure for new selection
        if (current[fieldId].fieldDef.hasNested && JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          console.log('[handleFieldChange] Field has nested, initializing nested structure for new selection')
          
          // Handle checkbox/multi-select (array values)
          if (Array.isArray(newValue)) {
            console.log('[handleFieldChange] Handling array value (checkbox/multi-select)')
            const newNestedData = {}
            const oldNestedData = current[fieldId].nestedData || {}
            
            newValue.forEach((selectedValue, arrayIndex) => {
              const selectedOption = current[fieldId].fieldDef.options?.find(
                opt => opt.value === selectedValue || opt.label === selectedValue
              )
              
              if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
                console.log(`[handleFieldChange] Array item ${arrayIndex} (${selectedValue}) has nested fields:`, selectedOption.nestedFields.map(f => f.id))
                
                // Check if this selection existed before (preserve data if possible)
                const oldMatchingIndex = Array.isArray(oldValue) 
                  ? oldValue.findIndex(v => v === selectedValue)
                  : -1
                
                // Initialize nested fields for this array item with index prefix
                selectedOption.nestedFields.forEach(nestedField => {
                  const prefixedFieldId = `${arrayIndex}_${nestedField.id}`
                  const oldPrefixedFieldId = oldMatchingIndex >= 0 
                    ? `${oldMatchingIndex}_${nestedField.id}`
                    : null
                  
                  // Try to preserve existing data if this option was already selected
                  if (oldPrefixedFieldId && oldNestedData[oldPrefixedFieldId]) {
                    console.log(`[handleFieldChange] Preserving data for ${prefixedFieldId} from ${oldPrefixedFieldId}`)
                    newNestedData[prefixedFieldId] = {
                      ...oldNestedData[oldPrefixedFieldId],
                      _arrayIndex: arrayIndex,
                      _arrayValue: selectedValue
                    }
                  } else {
                    newNestedData[prefixedFieldId] = {
                      fieldDef: nestedField,
                      value: '',
                      nestedData: {},
                      _arrayIndex: arrayIndex,
                      _arrayValue: selectedValue,
                      _originalFieldId: nestedField.id
                    }
                    console.log(`[handleFieldChange] Initialized new nested field for array item ${arrayIndex}: ${prefixedFieldId}`)
                  }
                })
              }
            })
            
            current[fieldId].nestedData = newNestedData
            current[fieldId]._isArray = true
            console.log('[handleFieldChange] Initialized array nested data with keys:', Object.keys(newNestedData))
          } 
          // Handle single select/radio (single value)
          else {
            const selectedOption = current[fieldId].fieldDef.options?.find(
              opt => opt.value === newValue || opt.label === newValue
            )
            
            if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
              console.log('[handleFieldChange] Selected option has nested fields:', selectedOption.nestedFields.map(f => f.id))
              
              // Initialize nested structure for the newly selected option
              const newNestedData = {}
              selectedOption.nestedFields.forEach(nestedField => {
                newNestedData[nestedField.id] = {
                  fieldDef: nestedField,
                  value: '',
                  nestedData: {}
                }
                console.log(`[handleFieldChange] Initialized nested field: ${nestedField.id}`)
              })
              
              current[fieldId].nestedData = newNestedData
              console.log('[handleFieldChange] Initialized nested data with keys:', Object.keys(newNestedData))
            } else {
              console.log('[handleFieldChange] Selected option has no nested fields, clearing nested data')
              current[fieldId].nestedData = {}
            }
          }
        }
      } else {
        console.error(`[handleFieldChange] Field ${fieldId} not found at this level!`)
        console.error('[handleFieldChange] Available fields:', Object.keys(current))
      }
      
      console.log('[handleFieldChange] Returning updated data:', newData)
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
                  onChange={(e) => {
                    console.log(`[Select onChange] Field: ${fieldId}, Level: ${level}, Path:`, path)
                    console.log(`[Select onChange] Old value: "${value}", New value: "${e.target.value}"`)
                    console.log(`[Select onChange] fieldDef.hasNested:`, fieldDef.hasNested)
                    handleFieldChange(fieldId, e.target.value, path)
                  }}
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
                  // Handle array values (checkboxes with multiple selections)
                  if (Array.isArray(value) && fieldInfo._isArray) {
                    console.log(`[renderNestedFormFields] Rendering array field with nested data`, {fieldId, value, nestedData})
                    
                    // Group nested data by array index
                    const groupedByIndex = {}
                    if (nestedData) {
                      Object.entries(nestedData).forEach(([nestedFieldId, nestedFieldInfo]) => {
                        const arrayIndex = nestedFieldInfo._arrayIndex
                        if (arrayIndex !== undefined) {
                          if (!groupedByIndex[arrayIndex]) {
                            groupedByIndex[arrayIndex] = {
                              value: nestedFieldInfo._arrayValue,
                              fields: {}
                            }
                          }
                          groupedByIndex[arrayIndex].fields[nestedFieldId] = nestedFieldInfo
                        }
                      })
                    }
                    
                    // Render nested fields for each selected checkbox option
                    return (
                      <div className="mt-3 space-y-3">
                        {value.map((selectedValue, idx) => {
                          const selectedOption = fieldDef.options.find(opt => opt.value === selectedValue || opt.label === selectedValue)
                          if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
                            const arrayIndexData = groupedByIndex[idx]
                            
                            return (
                              <Card key={idx} className="bg-gradient-to-br from-purple-50/50 to-transparent border-purple-200">
                                <CardHeader className="pb-3 px-4 pt-3">
                                  <CardTitle className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                                    <span className="h-1 w-1 rounded-full bg-purple-500"></span>
                                    Nested fields for: {selectedValue}
                                    <Badge variant="secondary" className="text-xs ml-auto">
                                      Checkbox {idx + 1}
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4">
                                  {arrayIndexData && Object.keys(arrayIndexData.fields).length > 0 ? (
                                    renderNestedFormFields(arrayIndexData.fields, level + 1, currentPath)
                                  ) : (
                                    <div className="text-sm text-muted-foreground italic py-2">
                                      No nested data for this selection
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )
                          }
                          return null
                        })}
                      </div>
                    )
                  }
                  
                  // Handle single value (non-array)
                  const selectedOption = fieldDef.options.find(opt => opt.value === value || opt.label === value)
                  if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
                    // Show nested fields from the selected option
                    const nestedFieldsToShow = {}
                    
                    selectedOption.nestedFields.forEach(nestedField => {
                      // Always prioritize existing data if available
                      if (nestedData && nestedData[nestedField.id]) {
                        nestedFieldsToShow[nestedField.id] = nestedData[nestedField.id]
                      } 
                      // In edit mode, show all nested fields for selected option (create empty if doesn't exist)
                      else if (isEditMode) {
                        nestedFieldsToShow[nestedField.id] = {
                          fieldDef: nestedField,
                          value: '',
                          nestedData: {}
                        }
                      }
                      // In view mode, only show fields that have data (already handled above)
                    })
                    
                    // Show card if there are fields to display
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
    <div className="space-y-6 w-full">
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
          
          {/* Table with negative margins to counteract CardContent padding for horizontal scroll */}
          <div className="-mx-6 px-6 overflow-x-auto">
            <div style={{ minWidth: 'max-content' }}>
              <DataTable 
                columns={createDynamicColumns()} 
                data={filteredRecords} 
                searchKey=""
                searchPlaceholder=""
              />
            </div>
          </div>
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
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        Primary Selection{nestedData.isMulti ? 's' : ''}
                      </h4>
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    {!isEditMode ? (
                      nestedData.isMulti ? (
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(editablePrimaryValue) ? (
                            editablePrimaryValue.map((val, idx) => (
                              <Badge key={idx} variant="default" className="text-base px-4 py-1">
                                {val}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="default" className="text-base px-4 py-1">
                              {editablePrimaryValue}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="default" className="text-base px-4 py-1">
                          {editablePrimaryValue}
                        </Badge>
                      )
                    ) : (
                      nestedData.isMulti ? (
                        <div className="space-y-2">
                          {nestedData.options?.map((option, idx) => {
                            const isChecked = Array.isArray(editablePrimaryValue) 
                              ? editablePrimaryValue.includes(option.value)
                              : editablePrimaryValue === option.value
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  let newValue
                                  if (Array.isArray(editablePrimaryValue)) {
                                    newValue = isChecked
                                      ? editablePrimaryValue.filter(v => v !== option.value)
                                      : [...editablePrimaryValue, option.value]
                                  } else {
                                    newValue = [option.value]
                                  }
                                  handlePrimaryValueChange(newValue)
                                }}
                                className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                              >
                                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                  isChecked ? 'bg-primary border-primary' : 'border-muted-foreground'
                                }`}>
                                  {isChecked && (
                                    <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm font-medium">{option.label}</span>
                              </div>
                            )
                          })}
                        </div>
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
                      )
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
                      {nestedData.isMulti ? (
                        // Group fields by selection for multi-select
                        (() => {
                          const groupedBySelection = {}
                          Object.entries(editableFormData).forEach(([fieldId, fieldInfo]) => {
                            const index = fieldInfo._selectionIndex
                            if (index !== undefined) {
                              if (!groupedBySelection[index]) {
                                groupedBySelection[index] = {
                                  value: fieldInfo._selectionValue,
                                  fields: {},
                                  isEmpty: false
                                }
                              }
                              // Check if this is an empty marker
                              if (fieldInfo._isEmpty) {
                                groupedBySelection[index].isEmpty = true
                              } else {
                                groupedBySelection[index].fields[fieldId] = fieldInfo
                              }
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
                                {groupedBySelection[index].isEmpty || Object.keys(groupedBySelection[index].fields).length === 0 ? (
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
                        renderNestedFormFields(editableFormData)
                      )}
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
