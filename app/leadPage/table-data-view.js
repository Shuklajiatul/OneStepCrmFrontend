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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ArrowLeft,
  Database,
  RefreshCw,
  AlertCircle,
  Plus,
  Eye,
  Edit,
  Trash2,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import { toast } from "sonner"
import axios from "axios"
import { authUtils } from '@/lib/auth-utils'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const parseOptionalValuesArray = (optionalValuesInput) => {
  if (!optionalValuesInput) return []

  const tryParse = (value) => {
    if (Array.isArray(value)) {
      return value
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }

    if (typeof value === 'object') {
      return Array.isArray(value) ? value : []
    }

    return []
  }

  if (Array.isArray(optionalValuesInput)) {
    for (const entry of optionalValuesInput) {
      const parsed = tryParse(entry)
      if (parsed.length) {
        return parsed
      }
    }
  }

  if (typeof optionalValuesInput === 'string') {
    return tryParse(optionalValuesInput)
  }

  return []
}

const inferTypeFromColumnName = (name = '') => {
  const lower = name.toLowerCase()
  if (lower.includes('email')) return 'email'
  if (lower.includes('phone') || lower.includes('mobile')) return 'phone'
  if (lower.includes('location') || lower.includes('address')) return 'location'
  if (lower.includes('date') || lower.includes('dob')) return 'date'
  if (lower.includes('time')) return 'datetime'
  if (lower.includes('description') || lower.includes('notes') || lower.includes('feedback')) return 'textarea'
  if (lower.includes('amount') || lower.includes('salary') || lower.includes('price')) return 'number'
  return null
}

const normalizeColumnMetadata = (column) => {
  if (!column) return null
  const options = parseOptionalValuesArray(column.optional_values)
  const propertyType =
    column.properties?.field_type ||
    column.properties?.type ||
    column.properties?.input_type ||
    column.properties?.parent_datatype

  const nameBasedType = inferTypeFromColumnName(column.column_name || '')
  let resolvedParentDatatype = column.parent_datatype || propertyType || null

  if ((!resolvedParentDatatype || resolvedParentDatatype === 'text') && column.data_type === 'number') {
    resolvedParentDatatype = 'number'
  }

  if ((!resolvedParentDatatype || resolvedParentDatatype === 'text') && column.data_type === 'boolean') {
    resolvedParentDatatype = 'boolean'
  }

  if ((!resolvedParentDatatype || resolvedParentDatatype === 'text') && nameBasedType) {
    resolvedParentDatatype = nameBasedType
  }

  if ((!resolvedParentDatatype || resolvedParentDatatype === 'text') && options.length > 0) {
    resolvedParentDatatype =
      column.properties?.selection_style ||
      column.properties?.selection_type ||
      column.properties?.display_type ||
      column.properties?.field_type ||
      'select'
  }

  if (!resolvedParentDatatype) {
    resolvedParentDatatype = 'text'
  }

  return {
    ...column,
    resolvedOptions: options,
    resolvedParentDatatype,
    resolvedDataType: column.data_type || resolvedParentDatatype || 'text',
  }
}

const getColumnFieldType = (column) => {
  if (!column) return 'text'
  return (
    column.resolvedParentDatatype ||
    column.parent_datatype ||
    column.properties?.field_type ||
    column.properties?.type ||
    column.data_type ||
    inferTypeFromColumnName(column.column_name || '') ||
    'text'
  )
}

const normalizeFieldValueForForm = (rawValue, column) => {
  const fieldType = getColumnFieldType(column)

  const parseValue = (value) => {
    if (value === null || value === undefined) {
      return null
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return ''

      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          return JSON.parse(trimmed)
        } catch {
          return trimmed
        }
      }

      return trimmed
    }

    return value
  }

  const parsedValue = parseValue(rawValue)

  if (fieldType === 'checkbox') {
    if (Array.isArray(parsedValue)) {
      return parsedValue.map((item) => {
        if (typeof item === 'object' && item !== null) {
          return {
            value: item.value ?? '',
            nestedValues: item.nestedValues || {},
          }
        }
        return {
          value: item,
          nestedValues: {},
        }
      })
    }
    if (
      parsedValue &&
      typeof parsedValue === 'object' &&
      Array.isArray(parsedValue.value)
    ) {
      return parsedValue.value.map((item) => ({
        value: typeof item === 'object' && item !== null ? item.value ?? '' : item,
        nestedValues:
          typeof item === 'object' && item !== null && item.nestedValues
            ? item.nestedValues
            : {},
      }))
    }
    return []
  }

  if (fieldType === 'select' || fieldType === 'radio') {
    if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
      return {
        value: parsedValue.value ?? '',
        nestedValues: parsedValue.nestedValues || {},
      }
    }

    return {
      value: parsedValue ? String(parsedValue) : '',
      nestedValues: {},
    }
  }

  if (fieldType === 'phone') {
    if (parsedValue && typeof parsedValue === 'object') {
      return JSON.stringify(parsedValue)
    }
    return parsedValue ? String(parsedValue) : ''
  }

  if (typeof parsedValue === 'object' && parsedValue !== null && parsedValue.value !== undefined) {
    return typeof parsedValue.value === 'object'
      ? JSON.stringify(parsedValue.value)
      : String(parsedValue.value ?? '')
  }

  if (typeof parsedValue === 'object' && parsedValue !== null) {
    try {
      return JSON.stringify(parsedValue)
    } catch {
      return String(parsedValue)
    }
  }

  return parsedValue !== null && parsedValue !== undefined ? String(parsedValue) : ''
}

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
  const [filePreview, setFilePreview] = useState(null)

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
  const [activeOptionPopover, setActiveOptionPopover] = useState(null)
  const [nestedModalContext, setNestedModalContext] = useState('record')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

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

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: {
          'Authorization': authUtils.getAuthHeader(),
          'Content-Type': 'application/json',
        }
      })

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

      const columnsData = Array.isArray(columnsResponse.data)
        ? columnsResponse.data
        : (columnsResponse.data?.data || columnsResponse.data?.columns || [])
      let recordsData = recordsResponse.data

      if (!Array.isArray(recordsData)) {
        if (recordsData?.data && Array.isArray(recordsData.data)) {
          recordsData = recordsData.data
        } else if (recordsData?.records && Array.isArray(recordsData.records)) {
          recordsData = recordsData.records
        } else {
          recordsData = []
        }
      }

      const normalizedColumns = Array.isArray(columnsData)
        ? columnsData.map(normalizeColumnMetadata).filter(Boolean)
        : []

      setColumns(normalizedColumns)
      setRecords(recordsData)
      toast.success(`Loaded ${recordsData.length} records successfully!`)

    } catch (err) {
      const errorMsg = `Failed to fetch table data: ${err.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error fetching table data:", err)
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
    const initialFormState = {
      assigned_to: null,
    }

    columns.forEach((column) => {
      const fieldType = getColumnFieldType(column)
      if (fieldType === 'checkbox') {
        initialFormState[column.column_id] = []
      } else if (fieldType === 'select' || fieldType === 'radio') {
        initialFormState[column.column_id] = { value: '', nestedValues: {} }
      } else if (fieldType === 'phone') {
        initialFormState[column.column_id] = JSON.stringify({ countryCode: '', number: '' })
      } else {
        initialFormState[column.column_id] = ''
      }
    })

    setRecordFormData(initialFormState)
    setIsAddRecordDialogOpen(true)
  }

  // const openEditRecordDialog = (record) => {
  //   setRecordToEdit(record)

  //   const formData = {
  //     assigned_to: record.assigned_to === "NA" || !record.assigned_to ? null : record.assigned_to
  //   }

  //   columns.forEach(column => {
  //     const rawValue = getFieldValue(record, column.column_id, column)
  //     formData[column.column_id] = normalizeFieldValueForForm(rawValue, column)
  //   })

  //   setRecordFormData(formData)
  //   setIsEditRecordDialogOpen(true)
  // }

  const openEditRecordDialog = (record) => {
    console.log('Opening edit dialog for record:', record)
    setRecordToEdit(record)

    const formData = {
      assigned_to: record.assigned_to === "NA" || !record.assigned_to ? null : record.assigned_to
    }

    columns.forEach(column => {
      const rawValue = getFieldValue(record, column.column_id, column)
      console.log(`Column ${column.column_name}:`, rawValue)
      formData[column.column_id] = normalizeFieldValueForForm(rawValue, column)
    })

    console.log('Form data:', formData)
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
      const tokens = authUtils.getTokens()
      const user = tokens?.user
      let gId = null

      if (user?.g_ids) {
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

      const fieldValues = {}
      columns.forEach(column => {
        const payloadValue = buildFieldValuePayload(column, recordFormData[column.column_id])
        if (payloadValue !== null) {
          fieldValues[column.column_id] = payloadValue
        }
      })

      const assignedToValue = recordFormData.assigned_to
      const finalAssignedTo = assignedToValue === "none" || !assignedToValue ? null : assignedToValue

      const payload = {
        g_id: gId,
        assigned_to: finalAssignedTo,
        field_values: fieldValues
      }

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
      const tokens = authUtils.getTokens()
      const user = tokens?.user
      let gId = null

      if (user?.g_ids) {
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

      const fieldValues = {}
      columns.forEach(column => {
        const payloadValue = buildFieldValuePayload(column, recordFormData[column.column_id])
        if (payloadValue !== null) {
          fieldValues[column.column_id] = payloadValue
        }
      })

      const assignedToValue = recordFormData.assigned_to
      const finalAssignedTo = assignedToValue === "none" || !assignedToValue ? null : assignedToValue

      const payload = {
        g_id: gId,
        assigned_to: finalAssignedTo,
        field_values: fieldValues
      }

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

  const isBase64File = (str) => {
    if (typeof str !== 'string') return false
    return str.startsWith('data:') && str.includes('base64,')
  }

  const createFileFromBase64 = (base64String, filename = 'uploaded_file', originalType = null, originalSize = null, originalLastModified = null) => {
    if (!base64String) return null

    try {
      const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/)
      if (!matches || matches.length !== 3) {
        console.warn('Invalid base64 format:', base64String?.substring(0, 100))
        return null
      }

      const mimeType = matches[1]
      const base64Data = matches[2]

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
        isFromBase64: true
      }
    } catch (error) {
      console.error('Error creating file from base64:', error)
      return null
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
      const [, datePart] = match
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
          const [, datePart, hh = '00', mm = '00'] = match
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
    if (value && typeof value === 'object') {
      const countryCode = value.countryCode || value.code || ''
      const number = value.number || value.value || ''
      const country = value.country || ''
      const line = [countryCode, number].filter(Boolean).join(' ').trim()
      return (
        <div className="text-sm">
          {line && <div className="font-medium">{line}</div>}
          {country && <div className="text-xs text-muted-foreground">{country}</div>}
        </div>
      )
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
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
      } catch (e) {
        return (
          <a href={`tel:${value}`} className="text-blue-600 hover:underline">
            {String(value)}
          </a>
        )
      }
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

    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim()

      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(trimmed)

          if (parsed && typeof parsed === 'object') {
            if (parsed.value !== undefined) {
              return parsed
            }
            if (parsed.countryCode || parsed.number) {
              return parsed
            }
          }

          return parsed
        } catch (e) {
          return rawValue
        }
      }
    }

    return rawValue
  }

  const buildFieldValuePayload = (column, value) => {
    const fieldType = getColumnFieldType(column)

    if (value === null || value === undefined) return null

    // Handle checkbox (multi-select)
    if (fieldType === 'checkbox') {
      const normalizedArray = (Array.isArray(value) ? value : [])
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            if (!item.value) return null
            const payload = { value: item.value }
            if (item.nestedValues && Object.keys(item.nestedValues).length > 0) {
              payload.nestedValues = item.nestedValues
            }
            return payload
          }

          if (!item) return null
          return { value: item }
        })
        .filter(Boolean)

      if (!normalizedArray.length) return null
      return JSON.stringify(normalizedArray)
    }

    // Handle select & radio (single choice)
    if (fieldType === 'select' || fieldType === 'radio') {
      if (typeof value === 'object' && value !== null) {
        if (!value.value) return null
        return JSON.stringify({
          value: value.value,
          nestedValues: value.nestedValues || {},
        })
      }

      if (typeof value === 'string' && value.trim()) {
        return JSON.stringify({
          value: value.trim(),
          nestedValues: {},
        })
      }

      return null
    }

    // Handle remaining field types (wrap with { value })
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return null

      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          const parsed = JSON.parse(trimmed)
          return JSON.stringify({ value: parsed })
        } catch {
          return JSON.stringify({ value: trimmed })
        }
      }

      return JSON.stringify({ value: trimmed })
    }

    if (typeof value === 'object') {
      return JSON.stringify({ value })
    }

    return JSON.stringify({ value })
  }

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

  const isFileObject = (val) => {
    return val && typeof val === 'object' && (
      val.base64 !== undefined ||
      val.previewUrl !== undefined ||
      val.isFromBase64 === true ||
      (val.name !== undefined && val.type !== undefined)
    )
  }

  const findFieldDefinition = (fieldId, options, depth = 0) => {
    if (depth > 10) return null

    if (!options || !Array.isArray(options)) return null

    for (const opt of options) {
      if (opt.nestedFields && Array.isArray(opt.nestedFields)) {
        const found = opt.nestedFields.find(f => f.id === fieldId)
        if (found) return found

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

  const renderInlineNestedFields = (nestedValues, column, depth = 0, parentOptions = null) => {
    if (!nestedValues || typeof nestedValues !== 'object' || Object.keys(nestedValues).length === 0) {
      return null
    }

    let options = parentOptions || []
    if (!parentOptions) {
      options = getColumnOptions(column)
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
            const fieldDef = findFieldDefinition(fieldId, options)

            const fieldLabel = fieldDef?.label || fieldId
            let fieldValue = null
            let nestedFieldValues = null

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

            const renderFieldValue = () => {
              if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
                return <span className="text-xs text-muted-foreground italic">-</span>
              }

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

              if (nestedFieldValues && typeof nestedFieldValues === 'object' && Object.keys(nestedFieldValues).length > 0) {
                let nestedOptions = null
                if (fieldDef && fieldDef.options && Array.isArray(fieldDef.options)) {
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

              if (typeof fieldValue === 'object' && fieldValue !== null) {
                if (fieldValue.country || fieldValue.state || fieldValue.city) {
                  return formatLocationDisplay(fieldValue)
                }
                if (fieldValue.countryCode || fieldValue.number) {
                  return formatPhoneDisplay(fieldValue)
                }
              }

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

  const renderOptionsDropdown = (displayNode, column, selectedValues, onOpenNested, record, fieldValue) => {
    const options = getColumnOptions(column)

    const selectedSet = new Set(
      (Array.isArray(selectedValues) ? selectedValues : [selectedValues])
        .filter(Boolean)
        .map(v => String(v))
    )

    const hasNestedDataInRecord = fieldValue &&
      typeof fieldValue === 'object' &&
      fieldValue.nestedValues &&
      Object.keys(fieldValue.nestedValues).length >= 0

    const popoverKey = `${record?.record_id || 'new'}_${column.column_id}`

    if (!options.length && !hasNestedData(column)) {
      return (
        <div className="px-2 py-1 rounded border border-border bg-background">
          {displayNode}
        </div>
      )
    }

    return (
      <Popover
        open={activeOptionPopover === popoverKey}
        onOpenChange={(open) => setActiveOptionPopover(open ? popoverKey : null)}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="px-2 py-1 rounded border border-border hover:bg-muted/50 flex items-center gap-2 text-left w-full"
          >
            {displayNode}
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-72" align="start">
          <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
            Options for {column.column_name}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {options.length > 0 ? (
              options.map((opt, idx) => {
                const label = String(opt?.label ?? opt?.value ?? '')
                const value = String(opt?.value ?? label)
                const isSelected = selectedSet.has(value) || selectedSet.has(label)
                const hasNestedFields = opt.nestedFields && opt.nestedFields.length > 0

                return (
                  <div
                    key={idx}
                    className="px-3 py-2 text-sm hover:bg-accent cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={isSelected ? "font-medium text-foreground" : "text-muted-foreground"}>
                        {label}
                      </span>
                      {hasNestedFields && (
                        <Badge variant="outline" className="text-xs h-4">
                          Nested
                        </Badge>
                      )}
                    </div>
                    {isSelected && <span className="text-xs text-green-600">✓</span>}
                  </div>
                )
              })
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">No options defined</div>
            )}
          </div>

          {hasNestedDataInRecord && (
            <div className="border-t px-3 py-2 space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Current Nested Data:</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {Object.entries(fieldValue.nestedValues).map(([fieldId, nestedValue]) => {
                  const nestedFieldDef = findNestedFieldDefinition(fieldId, options)
                  const fieldLabel = nestedFieldDef?.label || nestedFieldDef?.name || fieldId
                  const value = nestedValue.value || nestedValue

                  return (
                    <div key={fieldId} className="flex justify-between items-center text-xs bg-muted/30 p-1 rounded">
                      <span className="font-medium">{fieldLabel}:</span>
                      <span className="truncate ml-2">{String(value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {hasNestedData(column) && (
            <button
              type="button"
              onClick={() => {
                setActiveOptionPopover(null)
                if (onOpenNested) onOpenNested()
              }}
              className="w-full border-t px-3 py-2 text-sm text-primary font-medium flex items-center gap-2 hover:bg-accent"
            >
              <Edit className="h-3.5 w-3.5" />
              {hasNestedDataInRecord ? 'Edit nested details' : 'Add nested details'}
            </button>
          )}
        </PopoverContent>
      </Popover>
    )
  }

  const findNestedFieldDefinition = (fieldId, options) => {
    if (!options || !Array.isArray(options)) return null

    for (const option of options) {
      if (option.nestedFields && Array.isArray(option.nestedFields)) {
        const found = option.nestedFields.find(field =>
          field.id === fieldId || field.name === fieldId
        )
        if (found) return found
      }
    }
    return null
  }

  const hasNestedData = (column) => {
    const modalEditableTypes = ['select', 'radio', 'checkbox']
    const parentDatatype = getColumnFieldType(column)

    if (parentDatatype && !modalEditableTypes.includes(parentDatatype)) {
      return false
    }

    const options = getColumnOptions(column)
    if (!options.length) {
      return false
    }

    const hasNestedFields = options.some(option =>
      option.nestedFields && Array.isArray(option.nestedFields) && option.nestedFields.length > 0
    )

    return hasNestedFields || modalEditableTypes.includes(parentDatatype)
  }

  const getColumnOptions = (column) => {
    if (!column) return []
    if (Array.isArray(column.resolvedOptions)) {
      return column.resolvedOptions
    }

    const parsed = parseOptionalValuesArray(column.optional_values)
    return parsed
  }

  const parseNestedData = (fieldValue, column) => {
    try {
      let parsed = fieldValue
      if (typeof fieldValue === 'string') {
        try {
          parsed = JSON.parse(fieldValue)
        } catch {
          parsed = null
        }
      }

      const options = getColumnOptions(column)
      const fieldType = getColumnFieldType(column)

      const isMulti = Array.isArray(parsed) || fieldType === 'checkbox'

      if (!parsed) {
        parsed = isMulti ? [] : { value: '', nestedValues: {} }
      }

      const result = {
        columnName: column.column_name,
        isMulti: isMulti,
        selectedValue: isMulti ? parsed.map(item => item.value) : parsed.value,
        options: options,
        formData: {}
      }

      const extractFormData = (nestedValues, parentFields) => {
        const formData = {}

        if (!nestedValues || typeof nestedValues !== 'object') return formData

        Object.entries(nestedValues).forEach(([fieldId, fieldData]) => {
          const fieldDef = parentFields?.find(f => f.id === fieldId)

          if (!fieldDef) return

          if (Array.isArray(fieldData)) {
            const arrayValue = fieldData.map(item => {
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

            const arrayNestedData = {}
            fieldData.forEach((item, index) => {
              if (item.nestedValues && Object.keys(item.nestedValues).length > 0) {
                let nestedFields = []
                if (fieldDef.options) {
                  const selectedOption = fieldDef.options.find(
                    opt => opt.value === item.value || opt.label === item.value
                  )
                  nestedFields = selectedOption?.nestedFields || []
                }

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
              value: arrayValue,
              nestedData: arrayNestedData,
              _isArray: true
            }
          }
          else if (typeof fieldData === 'object' && fieldData.value !== undefined) {
            let nestedFields = []
            if (fieldDef.options) {
              const selectedOption = fieldDef.options.find(
                opt => opt.value === fieldData.value || opt.label === fieldData.value
              )
              nestedFields = selectedOption?.nestedFields || []
            }

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
          else if (typeof fieldData === 'object') {
            const keys = Object.keys(fieldData)
            if (keys.length === 1 && keys[0] === 'value') {
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
          else {
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

      if (isMulti) {
        parsed.forEach((item, index) => {
          const selectedOption = options.find(opt => opt.value === item.value || opt.label === item.value)

          if (selectedOption) {
            if (selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
              const itemFormData = item.nestedValues && Object.keys(item.nestedValues).length > 0
                ? extractFormData(item.nestedValues, selectedOption.nestedFields)
                : {}

              if (Object.keys(itemFormData).length > 0) {
                Object.entries(itemFormData).forEach(([fieldId, fieldInfo]) => {
                  const prefixedFieldId = `${index}_${fieldId}`
                  result.formData[prefixedFieldId] = {
                    ...fieldInfo,
                    _originalFieldId: fieldId,
                    _selectionIndex: index,
                    _selectionValue: item.value
                  }
                })
              } else {
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
                })
              }
            } else {
              result.formData[`${index}_empty`] = {
                _selectionIndex: index,
                _selectionValue: item.value,
                _isEmpty: true
              }
            }
          }
        })
      } else {
        if (parsed.nestedValues) {
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

  const openNestedModal = ({
    fieldValue,
    column,
    recordId = null,
    source = 'record',
  }) => {
    const nestedData = parseNestedData(fieldValue, column)
    if (nestedData) {
      setNestedData(nestedData)
      setEditableFormData(JSON.parse(JSON.stringify(nestedData.formData)))
      setEditablePrimaryValue(nestedData.selectedValue)
      setCurrentRecordId(recordId)
      setCurrentColumnId(column.column_id)
      setNestedModalContext(source)
      setIsEditMode(source === 'record' ? false : true)
      setIsNestedModalOpen(true)
    }
  }

  const formatFieldValue = (rawValue, dataType, column = null, record = null) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return <span className="text-muted-foreground italic">-</span>
    }

    const fieldType = getColumnFieldType(column) || dataType || 'text'

    if (typeof rawValue === 'object' && rawValue !== null && rawValue.value !== undefined) {
      const simpleValue = String(rawValue.value)
      const hasNested = rawValue.nestedValues &&
        typeof rawValue.nestedValues === 'object' &&
        Object.keys(rawValue.nestedValues).length > 0

      if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
        const displayNode = (
          <div className="flex items-center gap-2">
            <span className="truncate max-w-[200px]">{simpleValue}</span>
            {hasNested && (
              <Badge variant="secondary" className="text-xs">
                +Nested
              </Badge>
            )}
          </div>
        )

        return renderOptionsDropdown(
          displayNode,
          column,
          simpleValue,
          hasNested
            ? () =>
              openNestedModal({
                fieldValue: rawValue,
                column,
                recordId: record?.record_id,
                source: 'record',
              })
            : undefined,
          record,
          rawValue
        )
      }

      return (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[200px]">{simpleValue}</span>
          {hasNested && (
            <Badge variant="secondary" className="text-xs">
              +Nested
            </Badge>
          )}
        </div>
      )
    }

    if (fieldType === 'phone' && typeof rawValue === 'object' && rawValue !== null) {
      return formatPhoneDisplay(rawValue)
    }

    if (typeof rawValue === 'string') {
      if (rawValue.trim().startsWith('{') && rawValue.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(rawValue)
          if (parsed && typeof parsed === 'object' && (parsed.countryCode || parsed.number)) {
            return formatPhoneDisplay(parsed)
          }
          if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
            const simpleValue = String(parsed.value)
            const hasNested = parsed.nestedValues &&
              typeof parsed.nestedValues === 'object' &&
              Object.keys(parsed.nestedValues).length > 0

            if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
              const displayNode = (
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[200px]">{simpleValue}</span>
                  {hasNested && (
                    <Badge variant="secondary" className="text-xs">
                      +Nested
                    </Badge>
                  )}
                </div>
              )

              return renderOptionsDropdown(
                displayNode,
                column,
                simpleValue,
                hasNested
                  ? () =>
                    openNestedModal({
                      fieldValue: rawValue,
                      column,
                      recordId: record?.record_id,
                      source: 'record',
                    })
                  : undefined,
                record,
                parsed
              )
            }
            return (
              <div className="flex items-center gap-2">
                <span className="truncate max-w-[200px]">{simpleValue}</span>
                {hasNested && (
                  <Badge variant="secondary" className="text-xs">
                    +Nested
                  </Badge>
                )}
              </div>
            )
          }
        } catch (e) {
          console.warn('Failed to parse JSON value:', e)
        }
      }
    }

    if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
      const displayNode = (
        <span className="truncate max-w-[200px]">{String(rawValue)}</span>
      )
      return renderOptionsDropdown(
        displayNode,
        column,
        String(rawValue),
        undefined,
        record,
        null
      )
    }

    switch (fieldType) {
      case 'email':
        return (
          <a href={`mailto:${rawValue}`} className="text-blue-600 hover:underline">
            {String(rawValue)}
          </a>
        )
      case 'phone': {
        let phoneData = rawValue
        if (typeof rawValue === 'string') {
          try {
            phoneData = JSON.parse(rawValue)
          } catch (e) {
            phoneData = rawValue
          }
        }
        return formatPhoneDisplay(phoneData)
      }
      case 'boolean':
        return (
          <Badge variant={String(rawValue) === 'true' || rawValue === true ? 'default' : 'secondary'}>
            {String(rawValue) === 'true' || rawValue === true ? 'Yes' : 'No'}
          </Badge>
        )
      case 'date':
      case 'datetime': {
        const formatted = formatDateOnly(rawValue)
        if (formatted) {
          return <span>{formatted}</span>
        }
        return <span className="truncate max-w-[200px]">{String(rawValue)}</span>
      }
      case 'number':
        return <span className="truncate max-w-[200px]">{String(rawValue)}</span>
      case 'textarea':
        return <span className="truncate max-w-[200px] whitespace-pre-wrap">{String(rawValue)}</span>
      case 'text':
      default:
        return <span className="truncate max-w-[200px]">{String(rawValue)}</span>
    }
  }

  const convertFormDataToAPIFormat = (formData) => {
    if (nestedData?.isMulti) {
      const result = []

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
          if (fieldInfo._isEmpty) {
            groupedBySelection[fieldInfo._selectionIndex].isEmpty = true
          } else if (fieldInfo._originalFieldId) {
            groupedBySelection[fieldInfo._selectionIndex].items[fieldInfo._originalFieldId] = fieldInfo
          }
        }
      })

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
      const result = {
        nestedValues: {}
      }

      const processLevel = (data) => {
        const levelData = {}

        Object.entries(data).forEach(([fieldId, fieldInfo]) => {
          if (fieldInfo.value) {
            if (fieldInfo._isArray && Array.isArray(fieldInfo.value)) {
              const arrayResult = []

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
      result.value = editablePrimaryValue

      return result
    }
  }

  const handleSaveNestedData = async () => {
    try {
      setIsSaving(true)

      const apiData = convertFormDataToAPIFormat(editableFormData)
      const fieldValueString = JSON.stringify(apiData)

      const payload = {
        field_values: {
          [currentColumnId]: fieldValueString
        }
      }

      if (nestedModalContext === 'record') {
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
          setNestedModalContext('record')
          await fetchTableData()
        }
      } else {
        setRecordFormData(prev => ({
          ...prev,
          [currentColumnId]: apiData,
        }))
        toast.success('Nested data updated')
        setIsEditMode(true)
        setIsNestedModalOpen(false)
        setNestedModalContext('record')
      }
    } catch (error) {
      console.log('Error saving nested data:', error)
      toast.error(error.response?.data?.message || 'Failed to update record')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectOrRadioChange = (column, selectedValue) => {
    setRecordFormData(prev => {
      const previous = prev[column.column_id]
      if (
        previous &&
        typeof previous === 'object' &&
        !Array.isArray(previous) &&
        previous.value === selectedValue
      ) {
        return prev
      }

      return {
        ...prev,
        [column.column_id]: {
          value: selectedValue,
          nestedValues: {},
        },
      }
    })
  }

  const handleCheckboxToggle = (column, optionValue) => {
    setRecordFormData(prev => {
      const currentValue = prev[column.column_id]
      const normalized = Array.isArray(currentValue) ? currentValue : []
      const existingIndex = normalized.findIndex(item => {
        if (typeof item === 'object' && item !== null) {
          return item.value === optionValue
        }
        return item === optionValue
      })

      let updated = [...normalized]
      if (existingIndex >= 0) {
        updated.splice(existingIndex, 1)
      } else {
        updated.push({
          value: optionValue,
          nestedValues: {},
        })
      }

      return {
        ...prev,
        [column.column_id]: updated,
      }
    })
  }

  const handleOpenNestedManagerFromForm = (column, dialogSource) => {
    const fieldValue = recordFormData[column.column_id]
    openNestedModal({
      fieldValue,
      column,
      recordId: null,
      source: dialogSource,
    })
  }

  const handlePrimaryValueChange = (newValue) => {
    setEditablePrimaryValue(newValue)

    if (newValue && nestedData.options) {
      if (Array.isArray(newValue)) {
        setEditableFormData(prevFormData => {
          const newFormData = {}

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

          newValue.forEach((selectedValue, index) => {
            const selectedOption = nestedData.options.find(
              opt => opt.value === selectedValue || opt.label === selectedValue
            )

            if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
              const existingForThisValue = existingDataByValue[selectedValue]

              selectedOption.nestedFields.forEach(field => {
                const prefixedFieldId = `${index}_${field.id}`

                if (existingForThisValue && existingForThisValue[field.id]) {
                  newFormData[prefixedFieldId] = {
                    ...existingForThisValue[field.id],
                    _selectionIndex: index,
                    _selectionValue: selectedValue
                  }
                } else {
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
              newFormData[`${index}_empty`] = {
                _selectionIndex: index,
                _selectionValue: selectedValue,
                _isEmpty: true
              }
            }
          })

          return newFormData
        })
      }
      else {
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
          setEditableFormData(newFormData)
        } else {
          setEditableFormData({})
        }
      }
    } else {
      setEditableFormData({})
    }
  }

  const handleFieldChange = (fieldId, newValue, path = []) => {
    setEditableFormData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData))

      let current = newData
      for (let i = 0; i < path.length; i++) {
        const pathItem = path[i]

        if (current[pathItem]) {
          if (!current[pathItem].nestedData) {
            current[pathItem].nestedData = {}
          }

          current = current[pathItem].nestedData
        } else {
          return prevData
        }
      }

      if (current[fieldId]) {
        const oldValue = current[fieldId].value
        current[fieldId].value = newValue

        if (current[fieldId].fieldDef.hasNested && JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          if (Array.isArray(newValue)) {
            const newNestedData = {}
            const oldNestedData = current[fieldId].nestedData || {}

            newValue.forEach((selectedValue, arrayIndex) => {
              const selectedOption = current[fieldId].fieldDef.options?.find(
                opt => opt.value === selectedValue || opt.label === selectedValue
              )

              if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
                const oldMatchingIndex = Array.isArray(oldValue)
                  ? oldValue.findIndex(v => v === selectedValue)
                  : -1

                selectedOption.nestedFields.forEach(nestedField => {
                  const prefixedFieldId = `${arrayIndex}_${nestedField.id}`
                  const oldPrefixedFieldId = oldMatchingIndex >= 0
                    ? `${oldMatchingIndex}_${nestedField.id}`
                    : null

                  if (oldPrefixedFieldId && oldNestedData[oldPrefixedFieldId]) {
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
                  }
                })
              }
            })

            current[fieldId].nestedData = newNestedData
            current[fieldId]._isArray = true
          }
          else {
            const selectedOption = current[fieldId].fieldDef.options?.find(
              opt => opt.value === newValue || opt.label === newValue
            )

            if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
              const newNestedData = {}
              selectedOption.nestedFields.forEach(nestedField => {
                newNestedData[nestedField.id] = {
                  fieldDef: nestedField,
                  value: '',
                  nestedData: {}
                }
              })

              current[fieldId].nestedData = newNestedData
            } else {
              current[fieldId].nestedData = {}
            }
          }
        }
      }

      return newData
    })
  }

  const renderNestedFieldsViewOnly = (formData, level = 0) => {
    if (!formData || Object.keys(formData).length === 0) return null

    return (
      <div className={`space-y-4 ${level > 0 ? 'ml-6 pl-4 border-l-2 border-primary/20' : ''}`}>
        {Object.entries(formData).map(([fieldId, fieldInfo]) => {
          const { fieldDef, value, nestedData } = fieldInfo

          const renderValue = () => {
            if (!value && value !== 0) {
              return <span className="text-muted-foreground italic">-</span>
            }

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

            if (Array.isArray(value)) {
              return (
                <div className="flex flex-wrap gap-1">
                  {value.map((val, idx) => {
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

            return <span className="text-foreground">{String(value)}</span>
          }

          return (
            <div key={fieldId} className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  {fieldDef.name || fieldDef.label || fieldDef.id || fieldId}
                </label>
                <Badge variant="outline" className="text-xs">
                  {fieldDef.type || 'text'}
                </Badge>
              </div>

              <div className="text-sm">
                {renderValue()}
              </div>

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

  const renderNestedFormFields = (formData, level = 0, path = []) => {
    if (!formData || Object.keys(formData).length === 0) return null

    return (
      <div className={`space-y-4 ${level > 0 ? 'ml-6 pl-4 border-l-2 border-primary/20' : ''}`}>
        {Object.entries(formData).map(([fieldId, fieldInfo]) => {
          const { fieldDef, value, nestedData } = fieldInfo
          const currentPath = [...path, fieldId]

          return (
            <div key={fieldId} className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  {fieldDef.label}
                  {fieldDef.required && <span className="text-destructive ml-1">*</span>}
                </label>
                <Badge variant="outline" className="text-xs">
                  {fieldDef.type}
                </Badge>
              </div>

              {fieldDef.type === 'select' && (
                <select
                  value={value || ''}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value, path)}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border rounded-md text-sm ${isEditMode
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
                      className={`flex items-center gap-2 p-3 rounded-md border ${isEditMode ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed bg-muted/30'
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
                        className={`flex items-center gap-2 p-3 rounded-md border ${isEditMode ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed bg-muted/30'
                          }`}
                      >
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground'
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

              {value && fieldDef.hasNested && fieldDef.options && (
                (() => {
                  if (Array.isArray(value) && fieldInfo._isArray) {
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

                  const selectedOption = fieldDef.options.find(opt => opt.value === value || opt.label === value)
                  if (selectedOption && selectedOption.nestedFields && selectedOption.nestedFields.length > 0) {
                    const nestedFieldsToShow = {}

                    selectedOption.nestedFields.forEach(nestedField => {
                      if (nestedData && nestedData[nestedField.id]) {
                        nestedFieldsToShow[nestedField.id] = nestedData[nestedField.id]
                      }
                      else if (isEditMode) {
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

                if (fieldDef.type === 'file') {
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

                  const parsedValue = parseJsonSafely(value)
                  const primitiveValue = (
                    parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue) && parsedValue.value !== undefined
                      ? parsedValue.value
                      : parsedValue
                  )

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

  // Pagination calculations
  const totalRecords = filteredRecords.length
  const totalFilteredPages = Math.ceil(totalRecords / pageSize)

  // Update total pages when filtered records change
  useEffect(() => {
    setTotalPages(totalFilteredPages)
    // Reset to first page if current page exceeds total pages
    if (currentPage > totalFilteredPages && totalFilteredPages > 0) {
      setCurrentPage(1)
    }
  }, [totalFilteredPages, currentPage])

  // Get current page records
  const currentPageRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1)
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
  const goToLastPage = () => setCurrentPage(totalPages)

  // Page size options
  const pageSizeOptions = [10, 25, 50, 100]

  // Create dynamic columns based on API response
  const createDynamicColumns = () => {
    if (!columns.length) return []

    const dynamicColumns = columns.map((column) => ({
      accessorKey: column.column_id,
      header: column.column_name,
    }))

    // Add fixed metadata columns
    const metadataColumns = [
      {
        accessorKey: "assigned_to",
        header: "Assigned To",
      },
      {
        accessorKey: "updated_by",
        header: "Updated By",
      },
      {
        accessorKey: "created_at",
        header: "Created At",
      },
      {
        accessorKey: "updated_at",
        header: "Updated At",
      },
      {
        id: "actions",
        header: "Actions",
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
            {/* Back to Tables */}
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
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Table Records</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
                {searchTerm && ` (filtered from ${safeRecords.length} total)`}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredRecords.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-1">
          {/* Search and Controls */}
          <div className="flex items-center justify-between pb-3">
            {/* Search Input - Left Side */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Page Size Selector - Right Side */}
            <div className="flex items-center gap-2">
              <Label htmlFor="page-size" className="text-sm whitespace-nowrap">
                Rows per page:
              </Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger id="page-size" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(size => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Create table columns first */}
          {(() => {
            const tableColumns = createDynamicColumns()

            if (filteredRecords.length === 0) {
              return (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No records found</p>
                  {safeRecords.length === 0 && (
                    <p className="text-sm mt-2">No records available for this table</p>
                  )}
                  {searchTerm && safeRecords.length > 0 && (
                    <p className="text-sm mt-2">Try adjusting your search terms</p>
                  )}
                </div>
              )
            }

            return (
              <>
                {/* Horizontal Scroll Container */}
                <div className="rounded-md border overflow-auto w-full relative mb-4">
                  <Table className="w-full min-w-max">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {tableColumns.map((column) => (
                          <TableHead
                            key={column.accessorKey || column.id}
                            className={`font-semibold text-foreground whitespace-nowrap ${column.id === "actions" ? "w-[140px] text-center" : ""
                              }`}
                          >
                            {column.header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPageRecords.map((record, recordIndex) => (
                        <TableRow
                          key={record.record_id || record.id || recordIndex}
                          className="border-b hover:bg-muted/30 transition-colors"
                        >
                          {tableColumns.map((column) => {
                            // Get the cell value based on column type
                            let cellContent = '-'

                            if (column.id === "actions") {
                              // Actions column
                              cellContent = (
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
                                  {/* <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-primary/10"
                                    title="Edit record"
                                    onClick={() => openEditRecordDialog(record)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button> */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-destructive/10"
                                    title="Delete record"
                                    onClick={() => {
                                      setRecordToDelete(record)
                                      setIsDeleteDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              )
                            } else if (column.accessorKey === "assigned_to") {
                              // Assigned To column
                              const assignedTo = record.assigned_to
                              if (!assignedTo || assignedTo === 'NA') {
                                cellContent = <span className="text-sm text-muted-foreground">-</span>
                              } else {
                                const user = users.find(u => (u.user_id || u.id) === assignedTo)
                                if (user) {
                                  const userName = user.first_name && user.last_name
                                    ? `${user.first_name} ${user.last_name}`
                                    : user.name || user.email || assignedTo
                                  cellContent = <span className="text-sm">{userName}</span>
                                } else {
                                  cellContent = <span className="text-sm">{assignedTo}</span>
                                }
                              }
                            } else if (column.accessorKey === "updated_by") {
                              // Updated By column
                              const updatedBy = record.updated_by
                              if (!updatedBy) {
                                cellContent = <span className="text-sm text-muted-foreground">-</span>
                              } else {
                                const user = users.find(u => (u.user_id || u.id) === updatedBy)
                                if (user) {
                                  const userName = user.first_name && user.last_name
                                    ? `${user.first_name} ${user.last_name}`
                                    : user.name || user.email || updatedBy
                                  cellContent = <span className="text-sm">{userName}</span>
                                } else {
                                  cellContent = <span className="text-sm">{updatedBy}</span>
                                }
                              }
                            } else if (column.accessorKey === "created_at") {
                              // Created At column
                              const date = new Date(record.created_at)
                              cellContent = (
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
                            } else if (column.accessorKey === "updated_at") {
                              // Updated At column
                              const date = record.updated_at
                              if (!date) {
                                cellContent = <span className="text-sm text-muted-foreground">-</span>
                              } else {
                                const dateObj = new Date(date)
                                cellContent = (
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
                              }
                            } else {
                              // Dynamic data columns
                              const columnData = columns.find(col => col.column_id === column.accessorKey)
                              if (columnData) {
                                const fieldValue = getFieldValue(record, column.accessorKey, columnData)
                                const displayDataType = getColumnFieldType(columnData)
                                cellContent = formatFieldValue(fieldValue, displayDataType, columnData, record)
                              } else {
                                cellContent = <span className="text-muted-foreground">-</span>
                              }
                            }

                            return (
                              <TableCell
                                key={column.accessorKey || column.id}
                                className={`py-3 whitespace-nowrap ${column.id === "actions" ? "w-[140px] text-center" : ""
                                  }`}
                              >
                                {cellContent}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                      {Math.min(currentPage * pageSize, filteredRecords.length)} of{' '}
                      {filteredRecords.length} entries
                      {searchTerm && ` (filtered from ${safeRecords.length} total)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* First Page Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToFirstPage}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>

                    {/* Previous Page Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Page Info */}
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-medium">Page</span>
                      <span className="font-bold">{currentPage}</span>
                      <span>of</span>
                      <span className="font-medium">{totalPages}</span>
                    </div>

                    {/* Next Page Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Last Page Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
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
                  getColumnFieldType(col) === 'email' ||
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
              onClick={() => {
                if (recordToDelete?.record_id) {
                  handleDeleteRecord(recordToDelete.record_id)
                } else {
                  toast.error("Invalid record ID")
                  setIsDeleteDialogOpen(false)
                }
              }}
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
                                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground'
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
        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-xl font-bold">Add New Record</DialogTitle>
            <DialogDescription className="text-base">
              Fill in the fields below to create a new record
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Content Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="p-6 space-y-6">
                {/* ASSIGNED TO FIELD */}
                <div className="space-y-4 bg-muted/20 p-4 rounded-lg border">
                  <Label htmlFor="add-assigned_to" className="text-base font-semibold">
                    Assigned To
                  </Label>
                  <Select
                    value={recordFormData.assigned_to || "none"}
                    onValueChange={(value) => setRecordFormData(prev => ({
                      ...prev,
                      assigned_to: value === "none" ? null : value
                    }))}
                  >
                    <SelectTrigger id="add-assigned_to" className="h-12 text-base">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-base">None</SelectItem>
                      {loadingUsers ? (
                        <SelectItem value="loading" disabled className="text-base">Loading users...</SelectItem>
                      ) : (
                        users.map((user) => {
                          const userId = user.user_id || user.id
                          const userName = user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.name || user.email || userId
                          return (
                            <SelectItem key={userId} value={userId} className="text-base">
                              {userName}
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* REST OF THE COLUMNS */}
                <div className="space-y-6">
                  {columns.map((column) => {
                    const fieldType = getColumnFieldType(column)
                    const storedValue = recordFormData[column.column_id]
                    const primitiveValue =
                      typeof storedValue === 'number'
                        ? String(storedValue)
                        : typeof storedValue === 'string'
                          ? storedValue
                          : ''

                    // Derive choice values
                    const choiceValue =
                      fieldType === 'select' || fieldType === 'radio'
                        ? typeof storedValue === 'object' && storedValue !== null && !Array.isArray(storedValue)
                          ? storedValue.value || ''
                          : typeof storedValue === 'string'
                            ? storedValue
                            : ''
                        : ''

                    const checkboxSelections =
                      fieldType === 'checkbox'
                        ? Array.isArray(storedValue)
                          ? storedValue
                            .map(item =>
                              typeof item === 'object' && item !== null ? item.value : item
                            )
                            .filter(Boolean)
                          : []
                        : []

                    // Get column options if available
                    const columnOptions = getColumnOptions(column)

                    // Special handling for phone numbers
                    if (fieldType === 'phone') {
                      let phoneData = { countryCode: '', number: '' }

                      // Parse the phone data from JSON string if it exists
                      if (storedValue) {
                        try {
                          const parsed = JSON.parse(storedValue)
                          phoneData = {
                            countryCode: parsed.countryCode || '',
                            number: parsed.number || ''
                          }
                        } catch (e) {
                          console.warn('Failed to parse phone data:', e)
                        }
                      }

                      return (
                        <div key={column.column_id} className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                          <Label htmlFor={`add-${column.column_id}`} className="text-base font-semibold">
                            {column.column_name}
                          </Label>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-4 space-y-2">
                              <Label htmlFor={`add-${column.column_id}-countryCode`} className="text-sm font-medium">
                                Country Code
                              </Label>
                              <Input
                                id={`add-${column.column_id}-countryCode`}
                                type="text"
                                value={phoneData.countryCode}
                                onChange={(e) => {
                                  const newCountryCode = e.target.value
                                  const newPhoneData = {
                                    ...phoneData,
                                    countryCode: newCountryCode
                                  }
                                  setRecordFormData(prev => ({
                                    ...prev,
                                    [column.column_id]: JSON.stringify(newPhoneData)
                                  }))
                                }}
                                placeholder="+91"
                                className="h-12 text-base"
                              />
                            </div>
                            <div className="md:col-span-8 space-y-2">
                              <Label htmlFor={`add-${column.column_id}-number`} className="text-sm font-medium">
                                Phone Number
                              </Label>
                              <Input
                                id={`add-${column.column_id}-number`}
                                type="tel"
                                value={phoneData.number}
                                onChange={(e) => {
                                  const newNumber = e.target.value
                                  const newPhoneData = {
                                    ...phoneData,
                                    number: newNumber
                                  }
                                  setRecordFormData(prev => ({
                                    ...prev,
                                    [column.column_id]: JSON.stringify(newPhoneData)
                                  }))
                                }}
                                placeholder="1234567890"
                                className="h-12 text-base"
                              />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground bg-blue-50 p-2 rounded">
                            💡 Enter country code (e.g., +91) and phone number separately
                          </p>
                        </div>
                      )
                    }

                    // Handle select fields with options
                    if ((fieldType === 'select' || fieldType === 'radio') && columnOptions.length > 0) {
                      return (
                        <div key={column.column_id} className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                          <Label htmlFor={`add-${column.column_id}`} className="text-base font-semibold">
                            {column.column_name}
                          </Label>
                          <Select
                            value={choiceValue || ''}
                            onValueChange={(newValue) => handleSelectOrRadioChange(column, newValue)}
                          >
                            <SelectTrigger id={`add-${column.column_id}`} className="h-12 text-base">
                              <SelectValue placeholder={`Select ${column.column_name}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {columnOptions.map((option, idx) => {
                                const optionLabel = option.label || option.value || String(option)
                                const optionValue = option.value || optionLabel
                                return (
                                  <SelectItem key={idx} value={optionValue} className="text-base">
                                    {optionLabel}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                          {hasNestedData(column) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!choiceValue}
                              onClick={() => handleOpenNestedManagerFromForm(column, 'add-form')}
                            >
                              Manage nested data
                            </Button>
                          )}
                        </div>
                      )
                    }

                    // Handle checkbox fields with options
                    if (fieldType === 'checkbox' && columnOptions.length > 0) {
                      return (
                        <div key={column.column_id} className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                          <Label className="text-base font-semibold">
                            {column.column_name}
                          </Label>
                          <div className="space-y-2">
                            {columnOptions.map((option, idx) => {
                              const optionLabel = option.label || option.value || String(option)
                              const optionValue = option.value || optionLabel
                              const isChecked = checkboxSelections.includes(optionValue)

                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleCheckboxToggle(column, optionValue)}
                                  className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground'
                                    }`}>
                                    {isChecked && (
                                      <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium">{optionLabel}</span>
                                </div>
                              )
                            })}
                          </div>
                          {hasNestedData(column) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={checkboxSelections.length === 0}
                              onClick={() => handleOpenNestedManagerFromForm(column, 'add-form')}
                            >
                              Manage nested data
                            </Button>
                          )}
                        </div>
                      )
                    }

                    // Regular field types
                    return (
                      <div key={column.column_id} className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                        <Label htmlFor={`add-${column.column_id}`} className="text-base font-semibold">
                          {column.column_name}
                        </Label>
                        {fieldType === 'textarea' ? (
                          <Textarea
                            id={`add-${column.column_id}`}
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="min-h-[120px] text-base resize-vertical"
                          />
                        ) : fieldType === 'number' ? (
                          <Input
                            id={`add-${column.column_id}`}
                            type="number"
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="h-12 text-base"
                          />
                        ) : fieldType === 'email' ? (
                          <Input
                            id={`add-${column.column_id}`}
                            type="email"
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="h-12 text-base"
                          />
                        ) : fieldType === 'date' || fieldType === 'datetime' ? (
                          <Input
                            id={`add-${column.column_id}`}
                            type={fieldType === 'date' ? 'date' : 'datetime-local'}
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="h-12 text-base"
                          />
                        ) : (
                          <Input
                            id={`add-${column.column_id}`}
                            type="text"
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="h-12 text-base"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddRecordDialogOpen(false)}
              className="h-12 text-base flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddRecord}
              disabled={isSubmittingRecord}
              className="h-12 text-base flex-1 gap-2"
            >
              {isSubmittingRecord ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Add Record
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={isEditRecordDialogOpen} onOpenChange={setIsEditRecordDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-xl font-bold">Edit Record</DialogTitle>
            <DialogDescription className="text-base">
              Update the fields below to modify this record
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Content Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="p-6 space-y-6">
                {/* ASSIGNED TO FIELD */}
                <div className="space-y-4 bg-muted/20 p-4 rounded-lg border">
                  <Label htmlFor="edit-assigned_to" className="text-base font-semibold">
                    Assigned To
                  </Label>
                  <Select
                    value={recordFormData.assigned_to || "none"}
                    onValueChange={(value) => {
                      setRecordFormData(prev => ({
                        ...prev,
                        assigned_to: value === "none" ? null : value
                      }))
                    }}
                  >
                    <SelectTrigger id="edit-assigned_to" className="h-12 text-base">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-base">None</SelectItem>
                      {loadingUsers ? (
                        <SelectItem value="loading" disabled className="text-base">Loading users...</SelectItem>
                      ) : (
                        users.map((user) => {
                          const userId = user.user_id || user.id
                          const userName = user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.name || user.email || userId
                          return (
                            <SelectItem key={userId} value={userId} className="text-base">
                              {userName}
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* REST OF THE COLUMNS */}
                <div className="space-y-6">
                  {columns.map((column) => {
                    const fieldType = getColumnFieldType(column)
                    const storedValue = recordFormData[column.column_id]
                    const primitiveValue =
                      typeof storedValue === 'number'
                        ? String(storedValue)
                        : typeof storedValue === 'string'
                          ? storedValue
                          : ''
                    const choiceValue =
                      fieldType === 'select' || fieldType === 'radio'
                        ? typeof storedValue === 'object' && storedValue !== null && !Array.isArray(storedValue)
                          ? storedValue.value || ''
                          : typeof storedValue === 'string'
                            ? storedValue
                            : ''
                        : ''
                    const checkboxSelections =
                      fieldType === 'checkbox'
                        ? Array.isArray(storedValue)
                          ? storedValue
                            .map(item =>
                              typeof item === 'object' && item !== null ? item.value : item
                            )
                            .filter(Boolean)
                          : []
                        : []

                    // Get column options if available
                    const columnOptions = getColumnOptions(column)

                    // Special handling for phone numbers
                    if (fieldType === 'phone') {
                      let phoneData = { countryCode: '', number: '' }

                      // Parse the phone data from JSON string
                      if (storedValue) {
                        try {
                          const parsed = JSON.parse(storedValue)
                          phoneData = {
                            countryCode: parsed.countryCode || '',
                            number: parsed.number || ''
                          }
                        } catch (e) {
                          console.warn('Failed to parse phone data:', e)
                        }
                      }

                      return (
                        <div key={column.column_id} className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                          <Label htmlFor={`edit-${column.column_id}`} className="text-base font-semibold">
                            {column.column_name}
                          </Label>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-4 space-y-2">
                              <Label htmlFor={`edit-${column.column_id}-countryCode`} className="text-sm font-medium">
                                Country Code
                              </Label>
                              <Input
                                id={`edit-${column.column_id}-countryCode`}
                                type="text"
                                value={phoneData.countryCode}
                                onChange={(e) => {
                                  const newCountryCode = e.target.value
                                  const newPhoneData = {
                                    ...phoneData,
                                    countryCode: newCountryCode
                                  }
                                  setRecordFormData(prev => ({
                                    ...prev,
                                    [column.column_id]: JSON.stringify(newPhoneData)
                                  }))
                                }}
                                placeholder="+91"
                                className="h-12 text-base"
                              />
                            </div>
                            <div className="md:col-span-8 space-y-2">
                              <Label htmlFor={`edit-${column.column_id}-number`} className="text-sm font-medium">
                                Phone Number
                              </Label>
                              <Input
                                id={`edit-${column.column_id}-number`}
                                type="tel"
                                value={phoneData.number}
                                onChange={(e) => {
                                  const newNumber = e.target.value
                                  const newPhoneData = {
                                    ...phoneData,
                                    number: newNumber
                                  }
                                  setRecordFormData(prev => ({
                                    ...prev,
                                    [column.column_id]: JSON.stringify(newPhoneData)
                                  }))
                                }}
                                placeholder="1234567890"
                                className="h-12 text-base"
                              />
                            </div>
                          </div>
                          {phoneData.countryCode || phoneData.number ? (
                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Current:
                              </div>
                              <span className="font-medium">
                                {phoneData.countryCode} {phoneData.number}
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Enter country code (e.g., +91) and phone number
                            </p>
                          )}
                        </div>
                      )
                    }

                    // Handle select fields with options
                    if ((fieldType === 'select' || fieldType === 'radio') && columnOptions.length > 0) {
                      return (
                        <div key={column.column_id} className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                          <Label htmlFor={`edit-${column.column_id}`} className="text-base font-semibold">
                            {column.column_name}
                          </Label>
                          <Select
                            value={choiceValue || ''}
                            onValueChange={(newValue) => handleSelectOrRadioChange(column, newValue)}
                          >
                            <SelectTrigger id={`edit-${column.column_id}`} className="h-12 text-base">
                              <SelectValue placeholder={`Select ${column.column_name}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {columnOptions.map((option, idx) => {
                                const optionLabel = option.label || option.value || String(option)
                                const optionValue = option.value || optionLabel
                                return (
                                  <SelectItem key={idx} value={optionValue} className="text-base">
                                    {optionLabel}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                          {hasNestedData(column) && (
                            <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                              💡 After selecting an option, use &quot;Manage nested data&quot; to edit nested fields.
                            </p>
                          )}
                          {hasNestedData(column) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!choiceValue}
                              onClick={() => handleOpenNestedManagerFromForm(column, 'edit-form')}
                            >
                              Manage nested data
                            </Button>
                          )}
                        </div>
                      )
                    }

                    // Handle checkbox fields with options
                    if (fieldType === 'checkbox' && columnOptions.length > 0) {
                      return (
                        <div key={column.column_id} className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                          <Label className="text-base font-semibold">
                            {column.column_name}
                          </Label>
                          <div className="space-y-2">
                            {columnOptions.map((option, idx) => {
                              const optionLabel = option.label || option.value || String(option)
                              const optionValue = option.value || optionLabel
                              const isChecked = checkboxSelections.includes(optionValue)

                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleCheckboxToggle(column, optionValue)}
                                  className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground'
                                    }`}>
                                    {isChecked && (
                                      <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium">{optionLabel}</span>
                                </div>
                              )
                            })}
                          </div>
                          {hasNestedData(column) && (
                            <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                              💡 After selecting options, use &quot;Manage nested data&quot; to update nested fields.
                            </p>
                          )}
                          {hasNestedData(column) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={checkboxSelections.length === 0}
                              onClick={() => handleOpenNestedManagerFromForm(column, 'edit-form')}
                            >
                              Manage nested data
                            </Button>
                          )}
                        </div>
                      )
                    }

                    // Regular field types
                    return (
                      <div key={column.column_id} className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                        <Label htmlFor={`edit-${column.column_id}`} className="text-base font-semibold">
                          {column.column_name}
                        </Label>
                        {fieldType === 'textarea' ? (
                          <Textarea
                            id={`edit-${column.column_id}`}
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="min-h-[120px] text-base resize-vertical"
                          />
                        ) : fieldType === 'number' ? (
                          <Input
                            id={`edit-${column.column_id}`}
                            type="number"
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="h-12 text-base"
                          />
                        ) : fieldType === 'email' ? (
                          <Input
                            id={`edit-${column.column_id}`}
                            type="email"
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="h-12 text-base"
                          />
                        ) : fieldType === 'date' || fieldType === 'datetime' ? (
                          <Input
                            id={`edit-${column.column_id}`}
                            type={fieldType === 'date' ? 'date' : 'datetime-local'}
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="h-12 text-base"
                          />
                        ) : (
                          <Input
                            id={`edit-${column.column_id}`}
                            type="text"
                            value={primitiveValue}
                            onChange={(e) => setRecordFormData(prev => ({ ...prev, [column.column_id]: e.target.value }))}
                            placeholder={`Enter ${column.column_name}`}
                            className="h-12 text-base"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditRecordDialogOpen(false)
                setRecordToEdit(null)
                setRecordFormData({})
              }}
              className="h-12 text-base flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRecord}
              disabled={isSubmittingRecord}
              className="h-12 text-base flex-1 gap-2"
            >
              {isSubmittingRecord ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Record
                </>
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
                      const displayDataType = getColumnFieldType(column)
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
    </div >
  )
}