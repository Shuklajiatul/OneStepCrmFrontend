"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { authUtils } from '@/lib/auth-utils'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

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
  
  // File preview modal state
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [filePreview, setFilePreview] = useState(null) // { name, mime, dataUrl }
  
  // Add/Edit record dialog state
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false)
  const [isEditRecordDialogOpen, setIsEditRecordDialogOpen] = useState(false)
  const [recordFormData, setRecordFormData] = useState({})
  const [recordToEdit, setRecordToEdit] = useState(null)
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [isViewRecordDialogOpen, setIsViewRecordDialogOpen] = useState(false)
  const [recordToView, setRecordToView] = useState(null)

  // Fetch columns and records on component mount
  useEffect(() => {
    if (table?.table_id) {
      fetchTableData()
    }
  }, [table?.table_id])

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: {
          'Authorization': authUtils.getAuthHeader(),
          'Content-Type': 'application/json',
        }
      })

      // Handle different response formats
      let usersData = []
      if (Array.isArray(response.data)) {
        usersData = response.data
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        usersData = response.data.data
      } else if (response.data?.users && Array.isArray(response.data.users)) {
        usersData = response.data.users
      }

      setUsers(usersData)
    } catch (err) {
      console.error("Error fetching users:", err)
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchTableData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [columnsResponse, recordsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/datatables/${table.table_id}/columns`, {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          }
        }),
        axios.get(`${API_BASE_URL}/api/records/${table.table_id}`, {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          }
        })
      ])

      const columnsData = Array.isArray(columnsResponse.data) ? columnsResponse.data : (columnsResponse.data?.data || columnsResponse.data?.columns || [])
      let recordsData = recordsResponse.data
      
      // Normalize recordsData to always be an array
      if (!Array.isArray(recordsData)) {
        if (recordsData?.data && Array.isArray(recordsData.data)) {
          recordsData = recordsData.data
        } else if (recordsData?.records && Array.isArray(recordsData.records)) {
          recordsData = recordsData.records
        } else {
          recordsData = []
        }
      }
      
      console.log('Columns data:', columnsData)
      console.log('Records data:', recordsData)
      
      // Debug: Show column to field mapping
      if (Array.isArray(columnsData) && columnsData.length > 0 && Array.isArray(recordsData) && recordsData.length > 0) {
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
      
      setColumns(Array.isArray(columnsData) ? columnsData : [])
      setRecords(recordsData)
      toast.success(`Loaded ${recordsData.length} records successfully!`)
      
    } catch (err) {
      const errorMsg = `Failed to fetch table data: ${err.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error fetching table data:", err)
      // Ensure records is always an array even on error
      setRecords([])
      setColumns([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecord = async (recordId) => {
    setLoading(true)
    
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/records/${table.table_id}/${recordId}`, {
        headers: {
          'Authorization': authUtils.getAuthHeader(),
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

  const openAddRecordDialog = () => {
    setRecordFormData({
      assigned_to: null // Initialize as null
    })
    setIsAddRecordDialogOpen(true)
  }

  const openEditRecordDialog = (record) => {
    setRecordToEdit(record)
    // Initialize form data with current record values
    const formData = {
      assigned_to: record.assigned_to === "NA" || !record.assigned_to ? null : record.assigned_to
    }
    columns.forEach(column => {
      const value = getFieldValue(record, column.column_id, column)
      // Convert complex values to strings for form inputs
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          formData[column.column_id] = JSON.stringify(value)
        } else {
          formData[column.column_id] = String(value)
        }
      }
    })
    setRecordFormData(formData)
    setIsEditRecordDialogOpen(true)
  }

  const openViewRecordDialog = (record) => {
    setRecordToView(record)
    setIsViewRecordDialogOpen(true)
  }

  const handleAddRecord = async () => {
    setIsSubmittingRecord(true)
    
    try {
      // Get logged in user's g_id
      const tokens = authUtils.getTokens()
      const user = tokens?.user
      let gId = null
      
      if (user?.g_ids) {
        // Handle g_ids as array or single value
        if (Array.isArray(user.g_ids)) {
          gId = user.g_ids.length > 0 ? user.g_ids[0] : null
        } else {
          gId = user.g_ids
        }
      }
      
      if (!gId) {
        toast.error("User g_id not found. Please ensure you are properly logged in.")
        setIsSubmittingRecord(false)
        return
      }

      // Prepare field_values payload
      const fieldValues = {}
      columns.forEach(column => {
        const value = recordFormData[column.column_id]
        if (value !== undefined && value !== null && value !== '') {
          fieldValues[column.column_id] = value
        }
      })

      // Prepare assigned_to - convert "none" to null, otherwise use the user ID
      const assignedToValue = recordFormData.assigned_to
      const finalAssignedTo = assignedToValue === "none" || !assignedToValue ? null : assignedToValue

      const payload = {
        g_id: gId,
        assigned_to: finalAssignedTo, // Add assigned_to to payload
        field_values: fieldValues
      }

      console.log('Create record payload:', payload) // Debug log

      const response = await axios.post(
        `${API_BASE_URL}/api/records/${table.table_id}`,
        payload,
        {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          }
        }
      )

      toast.success("Record added successfully!")
      setIsAddRecordDialogOpen(false)
      setRecordFormData({})
      fetchTableData()
      
    } catch (err) {
      toast.error(`Failed to add record: ${err.response?.data?.message || err.message}`)
      console.error("Error adding record:", err)
    } finally {
      setIsSubmittingRecord(false)
    }
  }

  const handleUpdateRecord = async () => {
    if (!recordToEdit) return
    
    setIsSubmittingRecord(true)
    
    try {
      // Get logged in user's g_id
      const tokens = authUtils.getTokens()
      const user = tokens?.user
      let gId = null
      
      if (user?.g_ids) {
        // Handle g_ids as array or single value
        if (Array.isArray(user.g_ids)) {
          gId = user.g_ids.length > 0 ? user.g_ids[0] : null
        } else {
          gId = user.g_ids
        }
      }
      
      if (!gId) {
        toast.error("User g_id not found. Please ensure you are properly logged in.")
        setIsSubmittingRecord(false)
        return
      }
  
      // Prepare field_values payload (only include changed fields)
      const fieldValues = {}
      columns.forEach(column => {
        const value = recordFormData[column.column_id]
        if (value !== undefined && value !== null && value !== '') {
          fieldValues[column.column_id] = value
        }
      })
  
      // Prepare assigned_to - convert "none" to null, otherwise use the user ID
      const assignedToValue = recordFormData.assigned_to
      const finalAssignedTo = assignedToValue === "none" || !assignedToValue ? null : assignedToValue
  
      const payload = {
        g_id: gId,
        assigned_to: finalAssignedTo, // This should be null or the user ID, never "NA"
        field_values: fieldValues
      }
  
      console.log('Update record payload:', payload) // Debug log
  
      const response = await axios.put(
        `${API_BASE_URL}/api/records/${table.table_id}/${recordToEdit.record_id}`,
        payload,
        {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          }
        }
      )
  
      toast.success("Record updated successfully!")
      setIsEditRecordDialogOpen(false)
      setRecordToEdit(null)
      setRecordFormData({})
      fetchTableData()
      
    } catch (err) {
      toast.error(`Failed to update record: ${err.response?.data?.message || err.message}`)
      console.error("Error updating record:", err)
    } finally {
      setIsSubmittingRecord(false)
    }
  }

  // Helper to check if a string is a base64 file
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

  // Recursively process nested values to convert base64 files to file objects
  const processNestedValuesForFiles = (nestedValues, column = null) => {
    if (!nestedValues || typeof nestedValues !== 'object') return nestedValues

    const processed = Array.isArray(nestedValues) ? [] : {}

    if (Array.isArray(nestedValues)) {
      return nestedValues.map(item => {
        if (typeof item === 'object' && item !== null) {
          // Handle array items with value and nestedValues
          if (item.value !== undefined) {
            const processedItem = { ...item }
            
            // Check if value is a base64 file
            if (typeof item.value === 'string' && isBase64File(item.value)) {
              const fileObject = createFileFromBase64(
                item.value,
                item.name || column?.column_name || 'nested_file',
                item.type,
                item.size,
                item.lastModified
              )
              if (fileObject) {
                processedItem.value = fileObject
                processedItem.isFile = true
              }
            }
            
            // Recursively process nestedValues
            if (item.nestedValues && typeof item.nestedValues === 'object') {
              processedItem.nestedValues = processNestedValuesForFiles(item.nestedValues, column)
            }
            
            return processedItem
          }
          // Handle direct objects (like location or phone)
          return item
        }
        // Check if item itself is a base64 string
        if (typeof item === 'string' && isBase64File(item)) {
          const fileObject = createFileFromBase64(item, column?.column_name || 'nested_file')
          return fileObject || item
        }
        return item
      })
    } else {
      // Handle object structure
      Object.keys(nestedValues).forEach(key => {
        const value = nestedValues[key]
        
        if (typeof value === 'object' && value !== null) {
          if (value.value !== undefined) {
            const processedValue = { ...value }
            
            // Check if value is a base64 file
            if (typeof value.value === 'string' && isBase64File(value.value)) {
              const fileObject = createFileFromBase64(
                value.value,
                value.name || `nested_file_${key}`,
                value.type,
                value.size,
                value.lastModified
              )
              if (fileObject) {
                processedValue.value = fileObject
                processedValue.isFile = true
              }
            }
            
            // Recursively process nestedValues
            if (value.nestedValues && typeof value.nestedValues === 'object') {
              processedValue.nestedValues = processNestedValuesForFiles(value.nestedValues, column)
            }
            
            processed[key] = processedValue
          } else {
            // Direct object (location, phone, etc.) or recursive nested structure
            processed[key] = processNestedValuesForFiles(value, column)
          }
        } else if (typeof value === 'string' && isBase64File(value)) {
          // Direct base64 string
          const fileObject = createFileFromBase64(value, `nested_file_${key}`)
          processed[key] = fileObject || value
        } else {
          processed[key] = value
        }
      })
    }

    return processed
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

  const toDateInputValue = (input, includeTime = false) => {
    if (!input && input !== 0) return ''

    const dateObj = input instanceof Date
      ? input
      : (() => {
          const str = String(input).trim()
          if (!str) return null

          const direct = new Date(str)
          if (!Number.isNaN(direct.getTime())) return direct

          const match = str.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2})(?::(\d{2})(?::(\d{2}))?)?)?$/)
          if (match) {
            const [ , datePart, hh = '00', mm = '00' ] = match
            const [yearStr, monthStr, dayStr] = datePart.split('-')
            const year = Number(yearStr)
            const month = Number(monthStr)
            const day = Number(dayStr)

            if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
              return new Date(year, month - 1, day, Number(hh), Number(mm))
            }
            return null
          }

          return null
        })()

    if (!dateObj || Number.isNaN(dateObj.getTime())) return ''

    if (includeTime) {
      const iso = dateObj.toISOString()
      return iso.slice(0, 16)
    }

    return dateObj.toISOString().slice(0, 10)
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

  const getFieldValue = (record, columnId, column = null) => {
    if (!record || !record.field_values) return null
  
    if (!record.field_values[columnId]) return null
    
    const rawValue = record.field_values[columnId]
    
    // If the value is a JSON string, parse it
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim()
      
      // Check if it's a direct base64 file string
      if (isBase64File(trimmed)) {
        const fileObject = createFileFromBase64(trimmed, column?.column_name || 'file')
        return fileObject || rawValue
      }
      
      // Check if it's a JSON string (starts with { or [)
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(trimmed)
          
          // Recursively process nested values to convert base64 files
          if (typeof parsed === 'object' && parsed !== null) {
            // Check if it's an object with value property
            if (parsed.value !== undefined) {
              // Check if value itself is a base64 file
              if (typeof parsed.value === 'string' && isBase64File(parsed.value)) {
                const fileObject = createFileFromBase64(
                  parsed.value,
                  parsed.name || column?.column_name || 'file',
                  parsed.type,
                  parsed.size,
                  parsed.lastModified
                )
                if (fileObject) {
                  parsed.value = fileObject
                  parsed.isFile = true
                }
              }
              
              // Process nestedValues recursively
              if (parsed.nestedValues && typeof parsed.nestedValues === 'object') {
                parsed.nestedValues = processNestedValuesForFiles(parsed.nestedValues, column)
              }
            }
            // Check if it's an array (multi-select/checkbox)
            else if (Array.isArray(parsed)) {
              return parsed.map(item => {
                if (typeof item === 'object' && item !== null) {
                  if (item.value !== undefined) {
                    // Check if value is a base64 file
                    if (typeof item.value === 'string' && isBase64File(item.value)) {
                      const fileObject = createFileFromBase64(
                        item.value,
                        item.name || column?.column_name || 'file',
                        item.type,
                        item.size,
                        item.lastModified
                      )
                      if (fileObject) {
                        item.value = fileObject
                        item.isFile = true
                      }
                    }
                    
                    // Process nestedValues
                    if (item.nestedValues && typeof item.nestedValues === 'object') {
                      item.nestedValues = processNestedValuesForFiles(item.nestedValues, column)
                    }
                  }
                  return item
                }
                // Check if item itself is a base64 string
                if (typeof item === 'string' && isBase64File(item)) {
                  const fileObject = createFileFromBase64(item, column?.column_name || 'file')
                  return fileObject || item
                }
                return item
              })
            }
          }
          
          return parsed
        } catch (e) {
          // If parsing fails, check if it's a base64 file
          if (isBase64File(trimmed)) {
            const fileObject = createFileFromBase64(trimmed, column?.column_name || 'file')
            return fileObject || rawValue
          }
          // If parsing fails, return the original string
          return rawValue
        }
      }
    }
    
    return rawValue
  }

  // Infer filename from data URL and optional field label (accepts column or fieldDef)
  const inferFilenameFromDataUrl = (dataUrl, columnOrFieldDef) => {
    try {
      if (typeof dataUrl !== 'string') return 'file'
      const match = dataUrl.match(/^data:([^;]+);base64,/)
      const mime = match ? match[1] : 'application/octet-stream'
      const ext = ({
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'application/pdf': 'pdf'
      })[mime] || 'bin'
      // Support both column (has column_name) and fieldDef (has label)
      const baseName = columnOrFieldDef?.column_name || columnOrFieldDef?.label || 'file'
      const base = baseName.toString().replace(/\s+/g, '_').toLowerCase()
      return `${base}.${ext}`
    } catch {
      return 'file'
    }
  }

  const openFileModal = (dataUrl, columnOrFieldDef) => {
    if (!dataUrl || typeof dataUrl !== 'string') return
    const match = dataUrl.match(/^data:([^;]+);base64,/)
    const mime = match ? match[1] : 'application/octet-stream'
    const name = inferFilenameFromDataUrl(dataUrl, columnOrFieldDef)
    setFilePreview({ name, mime, dataUrl })
    setIsFileModalOpen(true)
  }

  const downloadDataUrl = (dataUrl, filename) => {
    try {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = filename || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      console.error('Download failed', e)
    }
  }

  // Helper to check if a value is a file object
  const isFileObject = (val) => {
    return val && typeof val === 'object' && (
      val.base64 !== undefined || 
      val.previewUrl !== undefined || 
      val.isFromBase64 === true ||
      (val.name !== undefined && val.type !== undefined)
    )
  }

  // Helper to recursively find field definition in nested options
  const findFieldDefinition = (fieldId, options, depth = 0) => {
    if (depth > 10) return null // Prevent infinite recursion
    
    if (!options || !Array.isArray(options)) return null
    
    for (const opt of options) {
      if (opt.nestedFields && Array.isArray(opt.nestedFields)) {
        // Check direct nested fields
        const found = opt.nestedFields.find(f => f.id === fieldId)
        if (found) return found
        
        // Recursively search in nested fields' options
        for (const nestedField of opt.nestedFields) {
          if (nestedField.options && Array.isArray(nestedField.options)) {
            const deepFound = findFieldDefinition(fieldId, nestedField.options.map(o => ({ nestedFields: o.nestedFields || [] })), depth + 1)
            if (deepFound) return deepFound
          }
        }
      }
    }
    return null
  }

  // Helper to render nested fields inline (similar to form submission page)
  const renderInlineNestedFields = (nestedValues, column, depth = 0, parentOptions = null) => {
    if (!nestedValues || typeof nestedValues !== 'object' || Object.keys(nestedValues).length === 0) {
      return null
    }

    // Parse options to get field definitions
    let options = parentOptions || []
    if (!parentOptions) {
      try {
        if (column?.optional_values && column.optional_values.length > 0) {
          options = JSON.parse(column.optional_values[0])
        }
      } catch (e) {
        console.warn('Failed to parse options:', e)
      }
    }

    const borderColorClass = depth === 0 ? 'border-primary/20' : depth === 1 ? 'border-blue-300/30' : 'border-green-300/30'
    const dotColor = depth === 0 ? 'bg-primary' : depth === 1 ? 'bg-blue-500' : 'bg-green-500'

    return (
      <div className={`mt-2 pl-3 border-l-2 ${borderColorClass} space-y-2 max-w-[400px]`}>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
          Additional Information {depth > 0 && `(Level ${depth + 1})`}
        </div>
        <div className="space-y-2">
          {Object.entries(nestedValues).map(([fieldId, fieldData]) => {
            // Try to find field definition from options (recursively)
            const fieldDef = findFieldDefinition(fieldId, options)

            const fieldLabel = fieldDef?.label || fieldId
            let fieldValue = null
            let nestedFieldValues = null

            // Extract value from fieldData
            if (fieldData && typeof fieldData === 'object') {
              if (fieldData.value !== undefined) {
                fieldValue = fieldData.value
                nestedFieldValues = fieldData.nestedValues
              } else {
                fieldValue = fieldData
              }
            } else {
              fieldValue = fieldData
            }

            // Format the value display
            const renderFieldValue = () => {
              if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
                return <span className="text-xs text-muted-foreground italic">-</span>
              }

              // Handle file objects
              if (isFileObject(fieldValue)) {
                const dataUrl = fieldValue.base64 || fieldValue.previewUrl
                return (
                  <button
                    onClick={() => dataUrl && openFileModal(dataUrl, column)}
                    className="text-blue-600 hover:underline text-xs"
                    title="Click to preview/download"
                  >
                    {fieldValue.name || 'File'}
                  </button>
                )
              }

              // Handle base64 strings
              if (typeof fieldValue === 'string' && isBase64File(fieldValue)) {
                const fileName = inferFilenameFromDataUrl(fieldValue, fieldDef)
                return (
                  <button
                    onClick={() => openFileModal(fieldValue, column)}
                    className="text-blue-600 hover:underline text-xs"
                    title="Click to preview/download"
                  >
                    {fileName}
                  </button>
                )
              }

              // Handle arrays
              if (Array.isArray(fieldValue)) {
                return (
                  <div className="flex flex-wrap gap-1">
                    {fieldValue.map((val, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {isFileObject(val) ? val.name : String(val)}
                      </Badge>
                    ))}
                  </div>
                )
              }

              // Handle objects with nestedValues
              if (nestedFieldValues && typeof nestedFieldValues === 'object' && Object.keys(nestedFieldValues).length > 0) {
                // Get nested field options from fieldDef
                let nestedOptions = null
                if (fieldDef && fieldDef.options && Array.isArray(fieldDef.options)) {
                  // Find the selected option to get its nested fields
                  const selectedOption = fieldDef.options.find(opt => {
                    const optValue = typeof opt === 'object' ? opt.value : opt
                    return optValue === fieldValue
                  })
                  if (selectedOption && selectedOption.nestedFields) {
                    nestedOptions = [selectedOption]
                  }
                }
                return (
                  <div className="space-y-1">
                    <span className="text-xs">{String(fieldValue || '')}</span>
                    {renderInlineNestedFields(nestedFieldValues, column, depth + 1, nestedOptions)}
                  </div>
                )
              }

              // Handle location/phone objects
              if (typeof fieldValue === 'object' && fieldValue !== null) {
                if (fieldValue.country || fieldValue.state || fieldValue.city) {
                  return formatLocationDisplay(fieldValue)
                }
                if (fieldValue.countryCode || fieldValue.number) {
                  return formatPhoneDisplay(fieldValue)
                }
              }

              // Default: string value
              return <span className="text-xs truncate max-w-[200px]">{String(fieldValue)}</span>
            }

            return (
              <div key={fieldId} className="p-2 bg-muted/20 rounded text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{fieldLabel}:</span>
                  {fieldDef?.type && (
                    <Badge variant="outline" className="text-xs">
                      {fieldDef.type}
                    </Badge>
                  )}
                </div>
                <div className="pl-1">
                  {renderFieldValue()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Helper to render an options dropdown for select/checkbox fields (shows on hover)
  const renderOptionsDropdown = (displayNode, column, selectedValues, onOpenNested) => {
    // Parse options from column.optional_values if available
    let options = []
    try {
      if (column?.optional_values && column.optional_values.length > 0) {
        options = JSON.parse(column.optional_values[0])
      }
    } catch (e) {
      console.warn('Failed to parse options:', e)
    }

    const selectedSet = new Set(
      (Array.isArray(selectedValues) ? selectedValues : [selectedValues])
        .filter(Boolean)
        .map(v => String(v))
    )

    return (
      <div className="group relative inline-block">
        {/* Display the selected value */}
        <div className="px-2 py-1 rounded border border-border hover:bg-muted/50 cursor-pointer">
            {displayNode}
        </div>
        
        {/* Dropdown that appears on hover */}
        <div className="absolute left-0 top-full mt-1 w-56 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-1">
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">Options</div>
            <div className="max-h-60 overflow-y-auto">
          {options.length > 0 ? (
            options.map((opt, idx) => {
              const label = String(opt?.label ?? opt?.value ?? '')
              const value = String(opt?.value ?? label)
              const isSelected = selectedSet.has(value) || selectedSet.has(label)
              return (
                    <div
                      key={idx}
                      className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer flex items-center gap-2"
                    >
                  <span className={isSelected ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {label}
                  </span>
                  {isSelected && <span className="ml-auto text-xs">✓</span>}
                    </div>
              )
            })
          ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No options</div>
          )}
            </div>
          {onOpenNested && (
            <>
                <div className="border-t my-1"></div>
                <div
                  onClick={onOpenNested}
                  className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer text-primary font-medium"
                >
                  View nested details
                </div>
            </>
          )}
          </div>
        </div>
      </div>
    )
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
            
            // Store array values with nested data, converting base64 files to file objects
            const arrayValue = fieldData.map(item => {
              // Check if value is a base64 file string
              if (typeof item.value === 'string' && isBase64File(item.value)) {
                const fileObject = createFileFromBase64(
                  item.value,
                  item.name || fieldDef.label || `file_${fieldId}`,
                  item.type,
                  item.size,
                  item.lastModified
                )
                return fileObject || item.value
              }
              return item.value
            })
            
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
              value: arrayValue, // Array of selected values (may include file objects)
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
            
            // Check if value is a base64 file string and convert to file object
            let processedValue = fieldData.value
            if (typeof fieldData.value === 'string' && isBase64File(fieldData.value)) {
              const fileObject = createFileFromBase64(
                fieldData.value,
                fieldData.name || fieldDef.label || `file_${fieldId}`,
                fieldData.type,
                fieldData.size,
                fieldData.lastModified
              )
              if (fileObject) {
                processedValue = fileObject
              }
            }
            
            formData[fieldId] = {
              fieldDef: fieldDef,
              value: processedValue,
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
              // Check if value is a base64 file string
              let processedValue = fieldData.value
              if (fieldDef.type === 'file' && typeof fieldData.value === 'string' && isBase64File(fieldData.value)) {
                const fileObject = createFileFromBase64(
                  fieldData.value,
                  fieldDef.label || `file_${fieldId}`,
                  null,
                  null,
                  null
                )
                if (fileObject) {
                  processedValue = fileObject
                }
              }
              formData[fieldId] = {
                fieldDef: fieldDef,
                value: processedValue,
                nestedData: {}
              }
            }
          }
          // Handle plain string/number values
          else {
            // Check if it's a file field with base64 string
            let processedValue = fieldData
            if (fieldDef.type === 'file' && typeof fieldData === 'string' && isBase64File(fieldData)) {
              const fileObject = createFileFromBase64(
                fieldData,
                fieldDef.label || `file_${fieldId}`,
                null,
                null,
                null
              )
              if (fileObject) {
                processedValue = fileObject
              }
            }
            formData[fieldId] = {
              fieldDef: fieldDef,
              value: processedValue,
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
  const formatFieldValue = (rawValue, dataType, column = null, record = null) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return <span className="text-muted-foreground italic">-</span>
    }

    const fieldType = column?.parent_datatype || dataType || 'text'
    
    // rawValue is already parsed by getFieldValue, so it could be:
    // - An array: [{"value":"Iphone "},{"value":"Samsung"}]
    // - An object: {"value":"Male","nestedValues":{}} or file object
    // - A string: (fallback case)
    
    // Handle arrays (multi-select, checkbox)
    if (Array.isArray(rawValue)) {
      const values = rawValue
        .map(item => {
          if (item && typeof item === 'object') {
            // Handle file objects in array
            if (isFileObject(item)) {
              return item.name || 'File'
            }
            // Handle objects with value property
            if (item.value !== undefined) {
              // Check if value is a file object
              if (isFileObject(item.value)) {
                return item.value.name || 'File'
              }
            return String(item.value)
            }
            // Handle direct file object
            if (isFileObject(item)) {
              return item.name || 'File'
            }
          }
          return String(item)
        })
        .filter(Boolean)
      
      if (values.length === 0) {
        return <span className="text-muted-foreground italic">-</span>
      }
      
      // Check if any item has nested data or files
      const hasNested = rawValue.some(item => {
        if (item && typeof item === 'object') {
          // Check for nested values
          if (item.nestedValues && Object.keys(item.nestedValues).length > 0) {
            return true
          }
          // Check if value is a file object
          if (item.value && isFileObject(item.value)) {
            return true
          }
          // Check if item itself is a file
          if (isFileObject(item)) {
            return true
          }
        }
        return false
      })
      
      // Render file buttons and badges
      const displayItems = rawValue.map((item, idx) => {
        if (item && typeof item === 'object') {
          // Check if item.value is a file object
          if (item.value !== undefined && isFileObject(item.value)) {
            const fileObj = item.value
            const dataUrl = fileObj.base64 || fileObj.previewUrl
            return (
              <button
                key={idx}
                onClick={() => dataUrl && openFileModal(dataUrl, column)}
                className="text-blue-600 hover:underline text-xs"
                title="Click to preview/download"
              >
                {fileObj.name || 'File'}
              </button>
            )
          }
          // Check if item itself is a file object
          if (isFileObject(item)) {
            const dataUrl = item.base64 || item.previewUrl
            return (
              <button
                key={idx}
                onClick={() => dataUrl && openFileModal(dataUrl, column)}
                className="text-blue-600 hover:underline text-xs"
                title="Click to preview/download"
              >
                {item.name || 'File'}
              </button>
            )
          }
          // Regular value
          return (
            <Badge key={idx} variant="secondary" className="text-xs">
              {item.value !== undefined ? String(item.value) : String(item)}
            </Badge>
          )
        }
        return (
          <Badge key={idx} variant="secondary" className="text-xs">
            {String(item)}
          </Badge>
        )
      })
      
      const badgesNode = (
        <div className="flex flex-wrap gap-1">
          {displayItems}
        </div>
      )

      // Collect nested fields from all items in the array
      const allNestedFields = {}
      rawValue.forEach((item, idx) => {
        if (item && typeof item === 'object' && item.nestedValues && Object.keys(item.nestedValues).length > 0) {
          // Merge nested values with index prefix to avoid conflicts
          Object.entries(item.nestedValues).forEach(([fieldId, fieldData]) => {
            const prefixedId = `${idx}_${fieldId}`
            allNestedFields[prefixedId] = {
              ...fieldData,
              _itemIndex: idx,
              _itemValue: item.value,
              _originalFieldId: fieldId
            }
          })
        }
      })

      const onOpenNested = hasNested && Object.keys(allNestedFields).length > 0
        ? () => openNestedModal(JSON.stringify(rawValue), column, record?.record_id)
        : undefined

      return renderOptionsDropdown(badgesNode, column, values, onOpenNested)
    }
    
    // Handle objects with value property
    if (typeof rawValue === 'object' && rawValue !== null) {
      // Check if it's a file object
      if (isFileObject(rawValue)) {
        const dataUrl = rawValue.base64 || rawValue.previewUrl
        return (
          <button
            onClick={() => dataUrl && openFileModal(dataUrl, column)}
            className="text-blue-600 hover:underline text-sm"
            title="Click to preview/download"
          >
            {rawValue.name || 'File'}
          </button>
        )
      }
      
      // Check if it has nested values
      const hasNested = rawValue.nestedValues && 
        typeof rawValue.nestedValues === 'object' && 
        Object.keys(rawValue.nestedValues).length > 0
      
      // Handle object with value property
      if (rawValue.value !== undefined) {
        // Check if value is a file object
        if (isFileObject(rawValue.value)) {
          const fileObj = rawValue.value
          const dataUrl = fileObj.base64 || fileObj.previewUrl
          return (
            <button
              onClick={() => dataUrl && openFileModal(dataUrl, column)}
              className="text-blue-600 hover:underline text-sm"
              title="Click to preview/download"
            >
              {fileObj.name || 'File'}
            </button>
          )
        }
        
        const simpleValue = String(rawValue.value)

        const displayNode = (
          <span className="truncate max-w-[200px]">{simpleValue}</span>
        )

        // For select/radio types, show dropdown of all options with "View nested" option
        if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
          return renderOptionsDropdown(
            displayNode, 
            column, 
            simpleValue, 
            hasNested ? () => openNestedModal(JSON.stringify(rawValue), column, record?.record_id) : undefined
          )
        }
      
        // For other field types, if they have nested values, show a hover dropdown with all options and "View nested" option
        if (hasNested) {
          // Parse options from column.optional_values if available
          let options = []
          try {
            if (column?.optional_values && column.optional_values.length > 0) {
              options = JSON.parse(column.optional_values[0])
            }
          } catch (e) {
            console.warn('Failed to parse options:', e)
          }

          const selectedValue = simpleValue
          const selectedSet = new Set([String(selectedValue)])

          const displayValue = (() => {
        switch (fieldType) {
          case 'email':
            return (
              <a href={`mailto:${simpleValue}`} className="text-blue-600 hover:underline">
                {simpleValue}
              </a>
            )
          case 'phone':
            return formatPhoneDisplay(rawValue)
          case 'location':
            return formatLocationDisplay(rawValue)
          case 'date':
          case 'datetime': {
            const formatted = formatDateOnly(simpleValue)
            if (formatted) {
              return <span>{formatted}</span>
            }
            return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
          }
          case 'file':
                if (typeof simpleValue === 'string' && simpleValue.startsWith('data:')) {
                  const fileName = inferFilenameFromDataUrl(simpleValue, column)
                  return (
                    <button
                      onClick={() => openFileModal(simpleValue, column)}
                      className="text-blue-600 hover:underline text-sm"
                      title="Click to preview/download"
                    >
                      {fileName}
                    </button>
                  )
                }
                return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
              default:
                return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
            }
          })()

          return (
            <div className="group relative inline-block">
              {/* Display the selected value */}
              <div className="px-2 py-1 rounded border border-border hover:bg-muted/50 cursor-pointer">
                {displayValue}
              </div>
              
              {/* Dropdown that appears on hover - same style as select/radio/checkbox */}
              <div className="absolute left-0 top-full mt-1 w-56 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-1">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">Options</div>
                  <div className="max-h-60 overflow-y-auto">
                    {options.length > 0 ? (
                      options.map((opt, idx) => {
                        const label = String(opt?.label ?? opt?.value ?? '')
                        const value = String(opt?.value ?? label)
                        const isSelected = selectedSet.has(value) || selectedSet.has(label)
                        return (
                          <div
                            key={idx}
                            className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer flex items-center gap-2"
                          >
                            <span className={isSelected ? "font-medium text-foreground" : "text-muted-foreground"}>
                              {label}
                            </span>
                            {isSelected && <span className="ml-auto text-xs">✓</span>}
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No options</div>
                    )}
                  </div>
                  <div className="border-t my-1"></div>
                  <div
                    onClick={() => openNestedModal(JSON.stringify(rawValue), column, record?.record_id)}
                    className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer text-primary font-medium"
                  >
                    View nested details
                  </div>
                </div>
              </div>
            </div>
          )
        }

        // No nested values, just show the value
        // For select/radio/checkbox, always wrap in dropdown even without nested values
        if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
          const displayNode = (
            <span className="truncate max-w-[200px]">{simpleValue}</span>
          )
          return renderOptionsDropdown(displayNode, column, simpleValue, undefined)
        }
        
        switch (fieldType) {
          case 'email':
            return (
              <a href={`mailto:${simpleValue}`} className="text-blue-600 hover:underline">
                {simpleValue}
              </a>
            )
          case 'phone':
            return formatPhoneDisplay(rawValue)
          case 'location':
            return formatLocationDisplay(rawValue)
          case 'date':
          case 'datetime': {
            const formatted = formatDateOnly(simpleValue)
            if (formatted) {
              return <span>{formatted}</span>
            }
            return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
          }
          case 'file':
            // Handle file with base64 data (string format)
            if (typeof simpleValue === 'string' && simpleValue.startsWith('data:')) {
              const fileName = inferFilenameFromDataUrl(simpleValue, column)
              return (
                <button
                  onClick={() => openFileModal(simpleValue, column)}
                  className="text-blue-600 hover:underline text-sm"
                  title="Click to preview/download"
                >
                  {fileName}
                </button>
              )
            }
            return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
          default:
            return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
        }
      }

      // Handle location object (country, state, city)
      if (rawValue.country || rawValue.state || rawValue.city) {
        return formatLocationDisplay(rawValue)
      }
      
      // Handle phone object (countryCode, number)
      if (rawValue.countryCode || rawValue.number) {
        return formatPhoneDisplay(rawValue)
      }
    }
    
    // Handle string values (fallback)
    const rawString = String(rawValue)
    
    // For select/radio/checkbox types, wrap in bordered box even if plain string
    if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
      const displayNode = (
        <span className="truncate max-w-[200px]">{rawString}</span>
      )
      return renderOptionsDropdown(displayNode, column, rawString, undefined)
    }
    
    switch (fieldType) {
      case 'email':
        return (
          <a href={`mailto:${rawString}`} className="text-blue-600 hover:underline">
            {rawString}
          </a>
        )
      case 'phone': {
        let phoneData = parseJsonSafely(rawString)
        if (phoneData && typeof phoneData === 'object') {
          return formatPhoneDisplay(phoneData)
        }
        return (
          <a href={`tel:${rawString}`} className="text-blue-600 hover:underline">
            {rawString}
          </a>
        )
      }
      case 'location': {
        let locationData = parseJsonSafely(rawString)
        if (locationData && typeof locationData === 'object') {
          return formatLocationDisplay(locationData)
        }
        return <span className="truncate max-w-[200px]">{rawString}</span>
      }
      case 'boolean':
        return (
          <Badge variant={rawString === 'true' || rawValue === true ? 'default' : 'secondary'}>
            {rawString === 'true' || rawValue === true ? 'Yes' : 'No'}
          </Badge>
        )
      case 'date':
      case 'datetime': {
        const formatted = formatDateOnly(rawString)
        if (formatted) {
          return <span>{formatted}</span>
        }
        return <span className="truncate max-w-[200px]">{rawString}</span>
      }
      case 'number':
        return <span className="truncate max-w-[200px]">{rawString}</span>
      case 'textarea':
        return <span className="truncate max-w-[200px] whitespace-pre-wrap">{rawString}</span>
      case 'text':
      default:
        return <span className="truncate max-w-[200px]">{rawString}</span>
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
            'Authorization': authUtils.getAuthHeader(),
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

  // Recursive component to render nested fields in VIEW-ONLY mode (matching form-submissions style)
  const renderNestedFieldsViewOnly = (formData, level = 0) => {
    if (!formData || Object.keys(formData).length === 0) return null

    return (
      <div className={`space-y-4 ${level > 0 ? 'ml-6 pl-4 border-l-2 border-primary/20' : ''}`}>
        {Object.entries(formData).map(([fieldId, fieldInfo]) => {
          const { fieldDef, value, nestedData } = fieldInfo
          
          // Format value display based on field type
          const renderValue = () => {
            if (!value && value !== 0) {
              return <span className="text-muted-foreground italic">-</span>
            }

            // Handle file objects
            if (isFileObject(value)) {
              const dataUrl = value.base64 || value.previewUrl
              return (
                <button
                  onClick={() => dataUrl && openFileModal(dataUrl, fieldDef)}
                  className="text-blue-600 hover:underline text-sm"
                  title="Click to preview/download"
                >
                  {value.name || 'File'}
                </button>
              )
            }

            // Handle arrays (checkbox/multi-select values)
            if (Array.isArray(value)) {
              return (
                <div className="flex flex-wrap gap-1">
                  {value.map((val, idx) => {
                    // Check if array item is a file
                    if (isFileObject(val)) {
                      const dataUrl = val.base64 || val.previewUrl
                      return (
                        <button
                          key={idx}
                          onClick={() => dataUrl && openFileModal(dataUrl, fieldDef)}
                          className="text-blue-600 hover:underline text-xs"
                          title="Click to preview/download"
                        >
                          {val.name || 'File'}
                        </button>
                      )
                    }
                    return (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {String(val)}
                      </Badge>
                    )
                  })}
                </div>
              )
            }

            // Handle regular values
            return <span className="text-foreground">{String(value)}</span>
          }
          
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
                {renderValue()}
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
                    {renderNestedFieldsViewOnly(nestedData, level + 1)}
                  </CardContent>
                </Card>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Recursive component to render nested form fields in EDIT mode
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
                  {!value && <option value="">Select {fieldDef.label}</option>}
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

              {(() => {
                const handledTypes = ['select', 'text', 'radio', 'checkbox']
                if (handledTypes.includes(fieldDef.type)) {
                  return null
                }

                const enhancedTypes = ['email', 'number', 'date', 'datetime', 'textarea', 'phone', 'location', 'file']
                if (!enhancedTypes.includes(fieldDef.type)) {
                  return (
                    <span className="text-sm text-muted-foreground italic">
                      Unsupported field type: {fieldDef.type}
                    </span>
                  )
                }

                // Handle file objects first (before parsing)
                if (fieldDef.type === 'file') {
                  // Check if value is a file object
                  if (isFileObject(value)) {
                    const fileObj = value
                    const dataUrl = fileObj.base64 || fileObj.previewUrl
                    return (
                      <div className="space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (dataUrl) openFileModal(dataUrl, fieldDef)
                          }}
                          className="text-blue-600 hover:underline text-sm"
                          title="Click to preview/download"
                        >
                          {fileObj.name || 'File'}
                        </button>
                        {!isEditMode && fileObj.size && (
                          <span className="text-xs text-muted-foreground">
                            {(fileObj.size / 1024).toFixed(2)} KB
                          </span>
                        )}
                      </div>
                    )
                  }
                  
                  // Check if value is a base64 string directly
                  if (typeof value === 'string' && isBase64File(value)) {
                    const fileName = inferFilenameFromDataUrl(value, fieldDef)
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openFileModal(value, fieldDef)
                        }}
                        className="text-blue-600 hover:underline text-sm"
                        title="Click to preview/download"
                      >
                        {fileName}
                      </button>
                    )
                  }
                  
                  // Parse value to check if it's wrapped in an object
                  const parsedValue = parseJsonSafely(value)
                  const primitiveValue = (
                    parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue) && parsedValue.value !== undefined
                      ? parsedValue.value
                      : parsedValue
                  )
                  
                  // Check if primitiveValue is a base64 string
                  if (typeof primitiveValue === 'string' && isBase64File(primitiveValue)) {
                    const fileName = inferFilenameFromDataUrl(primitiveValue, fieldDef)
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openFileModal(primitiveValue, fieldDef)
                        }}
                        className="text-blue-600 hover:underline text-sm"
                        title="Click to preview/download"
                      >
                        {fileName}
                      </button>
                    )
                  }
                  
                  // Check if primitiveValue is a file object
                  if (isFileObject(primitiveValue)) {
                    const fileObj = primitiveValue
                    const dataUrl = fileObj.base64 || fileObj.previewUrl
                    return (
                      <div className="space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (dataUrl) openFileModal(dataUrl, fieldDef)
                          }}
                          className="text-blue-600 hover:underline text-sm"
                          title="Click to preview/download"
                        >
                          {fileObj.name || 'File'}
                        </button>
                        {!isEditMode && fileObj.size && (
                          <span className="text-xs text-muted-foreground">
                            {(fileObj.size / 1024).toFixed(2)} KB
                          </span>
                        )}
                      </div>
                    )
                  }
                  
                  // Fallback
                  return <span className="text-sm text-muted-foreground">{value ? 'File' : '-'}</span>
                }

                const parsedValue = parseJsonSafely(value)
                const primitiveValue = (
                  parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue) && parsedValue.value !== undefined
                    ? parsedValue.value
                    : parsedValue
                )

                if (!isEditMode) {
                  switch (fieldDef.type) {
                    case 'email':
                      if (!primitiveValue) return <span className="text-muted-foreground">-</span>
                      return (
                        <a href={`mailto:${primitiveValue}`} className="text-sm text-blue-600 hover:underline">
                          {primitiveValue}
                        </a>
                      )
                    case 'number':
                      return <span className="text-sm">{primitiveValue ?? '-'}</span>
                    case 'date':
                    case 'datetime': {
                      const formatted = formatDateOnly(primitiveValue)
                      return <span className="text-sm">{formatted || primitiveValue || '-'}</span>
                    }
                    case 'textarea':
                      return (
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {primitiveValue ?? '-'}
                        </div>
                      )
                    case 'phone':
                      return formatPhoneDisplay(value)
                    case 'location':
                      return formatLocationDisplay(value)
                    default:
                      return <span className="text-sm">{primitiveValue ?? '-'}</span>
                  }
                }

                const handleSimpleChange = (newValue) => handleFieldChange(fieldId, newValue, path)
                const baseInputClass = 'w-full px-3 py-2 border rounded-md text-sm bg-background border-input focus:border-primary focus:ring-1 focus:ring-primary'

                switch (fieldDef.type) {
                  case 'file':
                    // File fields are read-only in nested forms (view only)
                    if (isFileObject(value)) {
                      const fileObj = value
                      const dataUrl = fileObj.base64 || fileObj.previewUrl
                      return (
                        <div className="space-y-2">
                          <button
                            onClick={() => dataUrl && openFileModal(dataUrl, column)}
                            className="text-blue-600 hover:underline text-sm"
                            title="Click to preview/download"
                          >
                            {fileObj.name || 'File'}
                          </button>
                          {fileObj.size && (
                            <span className="text-xs text-muted-foreground">
                              {(fileObj.size / 1024).toFixed(2)} KB
                            </span>
                          )}
                        </div>
                      )
                    }
                    if (typeof primitiveValue === 'string' && isBase64File(primitiveValue)) {
                      const fileName = inferFilenameFromDataUrl(primitiveValue, fieldDef)
                      return (
                        <button
                          onClick={() => openFileModal(primitiveValue, column)}
                          className="text-blue-600 hover:underline text-sm"
                          title="Click to preview/download"
                        >
                          {fileName}
                        </button>
                      )
                    }
                    return <span className="text-sm text-muted-foreground">No file</span>
                  case 'email':
                    return (
                      <Input
                        type="email"
                        value={primitiveValue ?? ''}
                        onChange={(e) => handleSimpleChange(e.target.value)}
                        className={baseInputClass}
                      />
                    )
                  case 'number':
                    return (
                      <Input
                        type="number"
                        value={primitiveValue ?? ''}
                        onChange={(e) => handleSimpleChange(e.target.value)}
                        className={baseInputClass}
                      />
                    )
                  case 'date':
                    return (
                      <Input
                        type="date"
                        value={toDateInputValue(primitiveValue, false)}
                        onChange={(e) => handleSimpleChange(e.target.value)}
                        className={baseInputClass}
                      />
                    )
                  case 'datetime':
                    return (
                      <Input
                        type="datetime-local"
                        value={toDateInputValue(primitiveValue, true)}
                        onChange={(e) => handleSimpleChange(e.target.value)}
                        className={baseInputClass}
                      />
                    )
                  case 'textarea':
                    return (
                      <textarea
                        value={primitiveValue ?? ''}
                        onChange={(e) => handleSimpleChange(e.target.value)}
                        className={`${baseInputClass} min-h-[100px]`}
                      />
                    )
                  case 'phone':
                    return (
                      <Input
                        type="tel"
                        value={typeof parsedValue === 'object' ? JSON.stringify(parsedValue) : String(primitiveValue ?? '')}
                        onChange={(e) => handleSimpleChange(e.target.value)}
                        className={baseInputClass}
                        placeholder='{"countryCode":"+91","number":"9876543210"}'
                      />
                    )
                  case 'location':
                    return (
                      <Input
                        type="text"
                        value={typeof parsedValue === 'object' ? JSON.stringify(parsedValue) : String(primitiveValue ?? '')}
                        onChange={(e) => handleSimpleChange(e.target.value)}
                        className={baseInputClass}
                        placeholder='{"city":"Mumbai","state":"Maharashtra","country":"India"}'
                      />
                    )
                  default:
                    return (
                      <Input
                        type="text"
                        value={primitiveValue ?? ''}
                        onChange={(e) => handleSimpleChange(e.target.value)}
                        className={baseInputClass}
                      />
                    )
                }
              })()}
            </div>
          )
        })}
      </div>
    )
  }

  // Ensure records is always an array
  const safeRecords = Array.isArray(records) ? records : []

  // Filter records based on search term
  const filteredRecords = safeRecords.filter(record => {
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
        const fieldValue = getFieldValue(record, column.column_id, column)
        
        // Format field value using helper function
        const displayDataType = column.parent_datatype || column.data_type
        return formatFieldValue(fieldValue, displayDataType, column, record)
      },
    }))

    // Add metadata columns
    const metadataColumns = [
      // Assigned To column
      {
        accessorKey: "assigned_to",
        header: "Assigned To",
        cell: ({ row }) => {
          const assignedTo = row.original.assigned_to
          if (!assignedTo || assignedTo === 'NA') {
            return <span className="text-sm text-muted-foreground">-</span>
          }
          // Find user by user_id
          const user = users.find(u => (u.user_id || u.id) === assignedTo)
          if (user) {
            const userName = user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : user.name || user.email || assignedTo
            return <span className="text-sm">{userName}</span>
          }
          return <span className="text-sm">{assignedTo}</span>
        },
      },
      // Updated By column
      {
        accessorKey: "updated_by",
        header: "Updated By",
        cell: ({ row }) => {
          const updatedBy = row.original.updated_by
          if (!updatedBy) {
            return <span className="text-sm text-muted-foreground">-</span>
          }
          // Find user by user_id
          const user = users.find(u => (u.user_id || u.id) === updatedBy)
          if (user) {
            const userName = user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : user.name || user.email || updatedBy
            return <span className="text-sm">{userName}</span>
          }
          return <span className="text-sm">{updatedBy}</span>
        },
      },
      // Created At column
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
      // Updated At column
      {
        accessorKey: "updated_at",
        header: "Updated At",
        cell: ({ row }) => {
          const date = row.getValue("updated_at")
          if (!date) {
            return <span className="text-sm text-muted-foreground">-</span>
          }
          const dateObj = new Date(date)
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
          const record = row.original
          return (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary/10"
                title="View record details"
                onClick={() => openViewRecordDialog(record)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary/10"
                title="Edit record"
                onClick={() => openEditRecordDialog(record)}
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
                <DropdownMenuContent align="center" className="w-[160px]">
                  <DropdownMenuItem 
                    className="cursor-pointer text-xs"
                    onClick={() => openViewRecordDialog(record)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer text-xs"
                    onClick={() => openEditRecordDialog(record)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-2" />
                    Edit Record
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-xs">
                    <Settings className="h-3.5 w-3.5 mr-2" />
                    Record Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      setRecordToDelete(record)
                      setIsDeleteDialogOpen(true)
                    }}
                    className="text-destructive cursor-pointer text-xs focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
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

  if (loading && safeRecords.length === 0) {
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
          
          <Button className="gap-2" onClick={openAddRecordDialog}>
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
                <p className="text-2xl font-bold">{safeRecords.length}</p>
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
                  {safeRecords.filter(r => r.field_values && Object.keys(r.field_values).length > 0).length}
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
                  {safeRecords.filter(r => !r.field_values || Object.keys(r.field_values).length === 0).length}
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
                {safeRecords.length} record{safeRecords.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {safeRecords.length}
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
          
        {/* Table with same styling as organizations page */}
        {(() => {
          const tableColumns = createDynamicColumns()
          return filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No records found</p>
              {safeRecords.length === 0 && (
                <p className="text-sm mt-2">No records available for this table</p>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                  <Table className="w-full table-auto">
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        {tableColumns.map((column) => (
                          <TableHead 
                            key={column.accessorKey || column.id} 
                            className={`font-semibold text-foreground ${
                              column.id === "actions" ? "w-[140px] text-center" : ""
                            }`}
                          >
                            {column.header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow 
                          key={record.record_id || record.id}
                          className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                        >
                          {tableColumns.map((column) => {
                            // Create a mock row object that matches DataTable's structure
                            const mockRow = {
                              original: record,
                              getValue: (key) => {
                                if (key === 'created_at') return record.created_at
                                return record.field_values?.[key] ?? record[key]
                              }
                            }
                            return (
                              <TableCell 
                                key={column.accessorKey || column.id} 
                                className={`py-3 ${
                                  column.id === "actions" ? "w-[140px] text-center" : ""
                                }`}
                              >
                                {column.cell ? column.cell({ row: mockRow }) : '-'}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )
        })()}
        </CardContent>
      </Card>

      

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Record
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ This action cannot be undone!
                </p>
              </div>
              
              <p>Are you sure you want to delete this record?</p>
              
              {/* Show email warning if record has email field */}
              {recordToDelete && (() => {
                // Find email column
                const emailColumn = columns.find(col => 
                  col.parent_datatype === 'email' || 
                  col.data_type === 'email' ||
                  col.column_name.toLowerCase().includes('email')
                )
                
                if (emailColumn) {
                  const emailValue = getFieldValue(recordToDelete, emailColumn.column_id, emailColumn)
                  if (emailValue && typeof emailValue === 'string' && emailValue.includes('@')) {
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Warning: This record contains email
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Email: <span className="font-mono">{emailValue}</span>
                        </p>
                      </div>
                    )
                  }
                }
                return null
              })()}
              
              <div className="bg-muted/50 rounded-lg p-3 mt-2">
                <p className="text-xs text-muted-foreground">
                  <strong>Record ID:</strong> {recordToDelete?.record_id}
                </p>
                {recordToDelete?.created_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Created:</strong> {new Date(recordToDelete.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteRecord(recordToDelete?.record_id)}
              disabled={loading}
              className="flex-1 gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Record
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Data Modal */}
      <Dialog open={isNestedModalOpen} onOpenChange={setIsNestedModalOpen}>
        <DialogContent className="w-[80vw] sm:w-[75vw] max-w-[1000px] sm:max-w-none max-h-[95vh] p-0 gap-0 flex flex-col">
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
                          {!editablePrimaryValue && <option value="">Select primary value</option>}
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
                                  isEditMode 
                                    ? renderNestedFormFields(groupedBySelection[index].fields)
                                    : renderNestedFieldsViewOnly(groupedBySelection[index].fields)
                                )}
                              </CardContent>
                            </Card>
                          ))
                        })()
                      ) : (
                        // Single selection - render normally
                        isEditMode 
                          ? renderNestedFormFields(editableFormData)
                          : renderNestedFieldsViewOnly(editableFormData)
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

      {/* File Preview Modal */}
      <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
        <DialogContent className="w-[80vw] sm:w-[70vw] max-w-[900px] max-h-[95vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>File Preview</DialogTitle>
            <DialogDescription className="truncate">
              {filePreview?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 py-4">
            {filePreview?.dataUrl ? (
              (() => {
                const isImage = filePreview.mime?.startsWith('image/')
                const isPdf = filePreview.mime === 'application/pdf'
                if (isImage) {
                  return (
                    <div className="flex items-center justify-center">
                      <img src={filePreview.dataUrl} alt={filePreview.name} className="max-h-[70vh] object-contain" />
                    </div>
                  )
                }
                if (isPdf) {
                  return (
                    <iframe src={filePreview.dataUrl} title={filePreview.name} className="w-full h-[70vh] border" />
                  )
                }
                return (
                  <div className="text-sm text-muted-foreground">
                    Preview not available for this file type.
                  </div>
                )
              })()
            ) : (
              <div className="text-sm text-muted-foreground">No file</div>
            )}
          </div>
          <div className="px-6 py-4 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-3">
            <Button onClick={() => filePreview && downloadDataUrl(filePreview.dataUrl, filePreview.name)}>Download</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Record Dialog */}
      <Dialog open={isAddRecordDialogOpen} onOpenChange={setIsAddRecordDialogOpen}>
        <DialogContent className="w-[90vw] sm:w-[80vw] max-w-[1000px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Record</DialogTitle>
            <DialogDescription>
              Fill in the fields below to create a new record
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {/* ASSIGNED TO FIELD - Add this section */}
              <div className="space-y-2">
                <Label htmlFor="add-assigned_to">
                  Assigned To
                </Label>
                <Select
                  value={recordFormData.assigned_to || "none"}
                  onValueChange={(value) => setRecordFormData(prev => ({ 
                    ...prev, 
                    assigned_to: value === "none" ? null : value
                  }))}
                >
                  <SelectTrigger id="add-assigned_to">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {loadingUsers ? (
                      <SelectItem value="loading" disabled>Loading users...</SelectItem>
                    ) : (
                      users.map((user) => {
                        const userId = user.user_id || user.id
                        const userName = user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user.name || user.email || userId
                        return (
                          <SelectItem key={userId} value={userId}>
                            {userName}
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* REST OF THE COLUMNS */}
              {columns.map((column) => {
                const fieldType = column.parent_datatype || column.data_type || 'text'
                const value = recordFormData[column.column_id] || ''
                
                return (
                  <div key={column.column_id} className="space-y-2">
                    <Label htmlFor={column.column_id}>
                      {column.column_name}
                    </Label>
                    {fieldType === 'textarea' ? (
                      <Textarea
                        id={column.column_id}
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                        className="min-h-[100px]"
                      />
                    ) : fieldType === 'number' ? (
                      <Input
                        id={column.column_id}
                        type="number"
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                      />
                    ) : fieldType === 'email' ? (
                      <Input
                        id={column.column_id}
                        type="email"
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                      />
                    ) : fieldType === 'date' || fieldType === 'datetime' ? (
                      <Input
                        id={column.column_id}
                        type={fieldType === 'date' ? 'date' : 'datetime-local'}
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                      />
                    ) : (
                      <Input
                        id={column.column_id}
                        type="text"
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRecordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecord} disabled={isSubmittingRecord}>
              {isSubmittingRecord ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Record'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={isEditRecordDialogOpen} onOpenChange={setIsEditRecordDialogOpen}>
        <DialogContent className="w-[90vw] sm:w-[80vw] max-w-[1000px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              Update the fields below to modify this record
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {/* ASSIGNED TO FIELD */}
              <div className="space-y-2">
                <Label htmlFor="edit-assigned_to">
                  Assigned To
                </Label>
                <Select
                  value={recordFormData.assigned_to || "none"}
                  onValueChange={(value) => {
                    console.log('Assigned to changed:', value)
                    setRecordFormData(prev => ({ 
                      ...prev, 
                      assigned_to: value === "none" ? null : value
                    }))
                  }}
                >
                  <SelectTrigger id="edit-assigned_to">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {loadingUsers ? (
                      <SelectItem value="loading" disabled>Loading users...</SelectItem>
                    ) : (
                      users.map((user) => {
                        const userId = user.user_id || user.id
                        const userName = user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user.name || user.email || userId
                        return (
                          <SelectItem key={userId} value={userId}>
                            {userName}
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* REST OF THE COLUMNS */}
              {columns.map((column) => {
                const fieldType = column.parent_datatype || column.data_type || 'text'
                const value = recordFormData[column.column_id] || ''
                
                return (
                  <div key={column.column_id} className="space-y-2">
                    <Label htmlFor={`edit-${column.column_id}`}>
                      {column.column_name}
                    </Label>
                    {fieldType === 'textarea' ? (
                      <Textarea
                        id={`edit-${column.column_id}`}
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                        className="min-h-[100px]"
                      />
                    ) : fieldType === 'number' ? (
                      <Input
                        id={`edit-${column.column_id}`}
                        type="number"
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                      />
                    ) : fieldType === 'email' ? (
                      <Input
                        id={`edit-${column.column_id}`}
                        type="email"
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                      />
                    ) : fieldType === 'date' || fieldType === 'datetime' ? (
                      <Input
                        id={`edit-${column.column_id}`}
                        type={fieldType === 'date' ? 'date' : 'datetime-local'}
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                      />
                    ) : (
                      <Input
                        id={`edit-${column.column_id}`}
                        type="text"
                        value={value}
                        onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                        placeholder={`Enter ${column.column_name}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditRecordDialogOpen(false)
              setRecordToEdit(null)
              setRecordFormData({})
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRecord} disabled={isSubmittingRecord}>
              {isSubmittingRecord ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Record'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Record Dialog */}
      <Dialog open={isViewRecordDialogOpen} onOpenChange={setIsViewRecordDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Record Details
            </DialogTitle>
            <DialogDescription className="text-base">
              Complete information for this record
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable Content Area */}
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Record Metadata */}
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Record Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <Label className="text-sm font-semibold text-muted-foreground">Record ID</Label>
                      <p className="text-sm font-mono bg-background p-2 rounded border break-all">{recordToView?.record_id || '-'}</p>
                    </div>
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <Label className="text-sm font-semibold text-muted-foreground">Created At</Label>
                      <p className="text-sm bg-background p-2 rounded border">
                        {recordToView?.created_at ? new Date(recordToView.created_at).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <Label className="text-sm font-semibold text-muted-foreground">Created By</Label>
                      <p className="text-sm bg-background p-2 rounded border">
                        {(() => {
                          const createdBy = recordToView?.created_by
                          if (!createdBy) return '-'
                          const user = users.find(u => (u.user_id || u.id) === createdBy)
                          return user ? `${user.first_name || user.name} ${user.last_name || ''}`.trim() : createdBy
                        })()}
                      </p>
                    </div>
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <Label className="text-sm font-semibold text-muted-foreground">Updated At</Label>
                      <p className="text-sm bg-background p-2 rounded border">
                        {recordToView?.updated_at ? new Date(recordToView.updated_at).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <Label className="text-sm font-semibold text-muted-foreground">Updated By</Label>
                      <p className="text-sm bg-background p-2 rounded border">
                        {(() => {
                          const updatedBy = recordToView?.updated_by
                          if (!updatedBy) return '-'
                          const user = users.find(u => (u.user_id || u.id) === updatedBy)
                          return user ? `${user.first_name || user.name} ${user.last_name || ''}`.trim() : updatedBy
                        })()}
                      </p>
                    </div>
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <Label className="text-sm font-semibold text-muted-foreground">Assigned To</Label>
                      <p className="text-sm bg-background p-2 rounded border">
                        {(() => {
                          const assignedTo = recordToView?.assigned_to
                          if (!assignedTo || assignedTo === 'NA') return 'Not assigned'
                          const user = users.find(u => (u.user_id || u.id) === assignedTo)
                          return user ? `${user.first_name || user.name} ${user.last_name || ''}`.trim() : assignedTo
                        })()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Field Values - Only render if recordToView exists */}
              {recordToView && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5 text-blue-500" />
                      Field Values
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {columns.map((column) => {
                      const fieldValue = getFieldValue(recordToView, column.column_id, column)
                      const displayDataType = column.parent_datatype || column.data_type
                      const formattedValue = formatFieldValue(fieldValue, displayDataType, column, recordToView)
                      
                      return (
                        <div key={column.column_id} className="space-y-2 p-4 bg-muted/20 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-semibold text-foreground">{column.column_name}</Label>
                            <Badge variant="outline" className="text-xs">
                              {displayDataType || 'text'}
                            </Badge>
                          </div>
                          <div className="text-sm bg-background p-3 rounded border min-h-[44px] break-words">
                            {formattedValue || <span className="text-muted-foreground italic">No value</span>}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          <DialogFooter className="px-6 py-4 border-t shrink-0 gap-3">
            <Button variant="outline" onClick={() => setIsViewRecordDialogOpen(false)} className="gap-2">
              <Eye className="h-4 w-4" />
              Close View
            </Button>
            {recordToView && (
              <Button onClick={() => {
                setIsViewRecordDialogOpen(false)
                openEditRecordDialog(recordToView)
              }} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Record
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}