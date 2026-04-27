"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  cn,
  parseOptionalValuesArray,
  getColumnFieldType,
  getColumnOptions,
  buildFieldValuePayload,
  updateNestedState,
  inferTypeFromColumnName,
  normalizeColumnMetadata,
  normalizeFieldValueForForm,
  formatDateOnly,
  formatPhoneDisplay,
  formatLocationDisplay,
  getFieldValue,
  inferFilenameFromDataUrl,
  isFileObject,
  safeParseJSON,
  hasNestedData,
  isBase64File,
  createFileFromBase64,
  base64ToBlob,
  toDateInputValue,
  openFileModal as utilOpenFileModal
} from "@/lib/utils"
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
  ChevronsRight,
  ListTodo,
  CalendarPlus,
  History,
  Clock,
  LayoutGrid,
  List,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Check,
  Loader2,
  X,
  Download,
  Flame,
  SlidersHorizontal,
  TrendingUp,
  DollarSign,
  Users,
  BarChart2,
  TriangleAlert
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { activitiesApi } from '@/lib/api-endpoint'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart as RechartsBarChart,
  Cell,
  Area,
  AreaChart as RechartsAreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import { toast } from "sonner"
import { authUtils } from '@/lib/auth-utils'
import { usersApi, datatablesApi, recordsApi, strategyApi, stageApi } from '@/lib/api-endpoint'
import CreateActivityDialog from "@/app/activities/components/create-activity-dialog"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { RecordModal } from "@/components/records/RecordModal"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { fetchPhoneCountries } from "@/lib/constants/location-api"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL



export default function TableDataView({ table, onBack }) {
  const router = useRouter()
  const [columns, setColumns] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState(null)
  const [viewMode, setViewMode] = useState('table')
  const [columnVisibility, setColumnVisibility] = useState({})

  const [searchTerm, setSearchTerm] = useState("")
  const [isNestedModalOpen, setIsNestedModalOpen] = useState(false)
  const [nestedData, setNestedData] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editableFormData, setEditableFormData] = useState({})
  const [editablePrimaryValue, setEditablePrimaryValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [currentRecordId, setCurrentRecordId] = useState(null)
  const [currentColumnId, setCurrentColumnId] = useState(null)

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' }) // 'asc', 'desc', 'none'

  // File preview modal state
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [filePreview, setFilePreview] = useState(null)

  // Cell data view modal state (for clicking nested column values)
  const [isCellDataModalOpen, setIsCellDataModalOpen] = useState(false)
  const [cellModalData, setCellModalData] = useState({ columnName: '', data: null })

  // Edit record dialog state
  const [isEditRecordDialogOpen, setIsEditRecordDialogOpen] = useState(false)
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false)
  const [recordToEdit, setRecordToEdit] = useState(null)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [activeOptionPopover, setActiveOptionPopover] = useState(null)
  const [nestedModalContext, setNestedModalContext] = useState('record')
  const [phoneCountries, setPhoneCountries] = useState([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Fetching guards to prevent double-hitting APIs
  const fetchedTableIdRef = useRef(null)
  const isFetchingTableRef = useRef(false)
  const fetchedUsersRef = useRef(false)
  const fetchedCountriesRef = useRef(false)
  const [pagination, setPagination] = useState({ next: null, prev: null, limit: 10 })

  // Create Activity Modal State
  const [isCreateActivityOpen, setIsCreateActivityOpen] = useState(false)
  const [activityInitialData, setActivityInitialData] = useState({})

  // Lead pipeline filter/UI state
  const [selectedStages, setSelectedStages] = useState([])
  const [selectedSources, setSelectedSources] = useState([])
  const [selectedOwners, setSelectedOwners] = useState([])
  const [scoreRange, setScoreRange] = useState([0, 100])
  const [showHotLeads, setShowHotLeads] = useState(false)
  const [showStaleLeads, setShowStaleLeads] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showInsights, setShowInsights] = useState(true)
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [stages, setStages] = useState([])


  const { table_id: tableId } = table

  // Fetch columns and records on component mount
  useEffect(() => {
    if (table?.table_id && fetchedTableIdRef.current !== table.table_id) {
      fetchTableData()
    }
  }, [table?.table_id])

  // Fetch users when component mounts
  useEffect(() => {
    if (!fetchedUsersRef.current) {
      fetchUsers()
    }
    if (!fetchedCountriesRef.current) {
      fetchCountriesData()
    }
  }, [])

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const fetchUsers = async () => {
    if (fetchedUsersRef.current) return
    fetchedUsersRef.current = true

    try {
      setLoadingUsers(true)
      const response = await usersApi.getAll()

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
      fetchedUsersRef.current = false // Allow retry on error
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchCountriesData = async () => {
    if (fetchedCountriesRef.current) return
    fetchedCountriesRef.current = true

    try {
      const data = await fetchPhoneCountries()
      setPhoneCountries(data)
    } catch (err) {
      console.error("Error fetching phone countries:", err)
      fetchedCountriesRef.current = false // Allow retry on error
    }
  }

  const fetchTableData = async (options = {}) => {
    // Support legacy calls and pagination parameters
    const { silent = true, next = null, prev = null, limit: limitOverride = null } =
      typeof options === 'boolean' ? { silent: options } : (options || {})

    const effectiveLimit = limitOverride || pagination.limit || pageSize || 10

    if (isFetchingTableRef.current && !next && !prev && !limitOverride) return
    isFetchingTableRef.current = true
    fetchedTableIdRef.current = table.table_id

    setLoading(true)
    setError(null)

    // Check if table is active before fetching
    if (table.is_active === false) {
      setError("This table is currently deactivated. Please contact your administrator to activate it.")
      setLoading(false)
      isFetchingTableRef.current = false
      return
    }

    try {
      const params = { limit: effectiveLimit }
      if (next) params.next = next
      if (prev) params.prev = prev

      const [columnsResponse, recordsResponse, strategyResponse] = await Promise.all([
        datatablesApi.getColumns(table.table_id),
        recordsApi.getAll(table.table_id, params),
        strategyApi.getAll(table.table_id)
      ])

      const columnsData = Array.isArray(columnsResponse.data)
        ? columnsResponse.data
        : (columnsResponse.data?.data || columnsResponse.data?.columns || [])
      
      let recordsData = []
      let nextCursor = null
      let prevCursor = null

      if (recordsResponse.data) {
        recordsData = recordsResponse.data.data || (Array.isArray(recordsResponse.data) ? recordsResponse.data : [])
        nextCursor = recordsResponse.data.next || null
        prevCursor = recordsResponse.data.prev || null
      }

      // Handle strategy and stages
      const strategies = Array.isArray(strategyResponse.data) ? strategyResponse.data : (strategyResponse.data?.data || [])
      const activeStrategy = strategies[0]
      let fetchedStages = []
      if (activeStrategy) {
        try {
          const stagesResponse = await stageApi.getAll(table.table_id, activeStrategy.strategy_id)
          fetchedStages = Array.isArray(stagesResponse.data) ? stagesResponse.data : (stagesResponse.data?.data || [])
          setStages(fetchedStages)
        } catch (stageErr) {
          console.error("Error fetching stages:", stageErr)
        }
      }

      const normalizedColumns = Array.isArray(columnsData)
        ? columnsData.map(normalizeColumnMetadata).filter(Boolean)
        : []

      setColumns(normalizedColumns)
      setRecords(recordsData)
      setPagination(prevPag => ({
        ...prevPag,
        next: nextCursor,
        prev: prevCursor,
        limit: effectiveLimit
      }))

      if (!silent) {
        toast.success(`Loaded ${recordsData.length} records successfully!`, {
          id: `leadpage-records-loaded-${table.table_id}`,
        })
      }

    } catch (err) {
      let errorMsg = `Error loading table data: ${err.message}`
      if (err.response?.status === 403 || err.response?.status === 401 || err.message.toLowerCase().includes('access denied')) {
        errorMsg = `Access Denied - You do not have permission to view this table. Please contact your administrator.`
      }
      setError(errorMsg)
      console.error("Error fetching table data:", err)
      setRecords([])
      setColumns([])
      fetchedTableIdRef.current = null // Reset on error to allow retry
    } finally {
      setLoading(false)
      isFetchingTableRef.current = false
    }
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'none'
    }
    setSortConfig({ key, direction })
    setCurrentPage(1)
  }

  const handleStageUpdate = async (recordId, newStage) => {
    try {
      const gId = authUtils.getGId()
      const gIds = authUtils.getGIds()
      const pId = authUtils.getPIds()

      // Find the existing record to include current field_values
      const record = records.find(r => r.record_id === recordId)
      if (!record) return

      const payload = {
        g_id: gId,
        g_ids: gIds,
        p_id: pId,
        lead_stage: newStage,
        field_values: record.field_values || {}
      }

      // Optimistic update
      setRecords(prev => prev.map(r =>
        r.record_id === recordId ? { ...r, lead_stage: newStage } : r
      ))

      await recordsApi.update(table.table_id, recordId, payload)
      toast.success(`Stage updated to ${newStage}`)
    } catch (err) {
      console.error("Failed to update stage:", err)
      toast.error("Failed to update lead stage")
      fetchTableData()
    }
  }

  const handleDeleteRecord = async (recordId) => {
    setLoading(true)

    try {
      const response = await recordsApi.delete(table.table_id, recordId)

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


  const openEditRecordDialog = (record) => {
    setRecordToEdit(record)
    setIsEditRecordDialogOpen(true)
  }

  const openAddRecordDialog = () => {
    setIsAddRecordDialogOpen(true)
  }

  const openFileModal = (dataUrl, columnOrFieldDef) => {
    utilOpenFileModal(dataUrl, columnOrFieldDef, (preview) => {
      setFilePreview(preview)
      setIsFileModalOpen(true)
    })
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
                if (fieldValue.countryCode || fieldValue.dial_code || fieldValue.number) {
                  return formatPhoneDisplay(fieldValue)
                }
                if (fieldValue.country || fieldValue.state || fieldValue.city) {
                  return formatLocationDisplay(fieldValue)
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

    if (!hasNestedData(column)) {
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

  const parseNestedData = (fieldValue, column) => {
    try {
      let parsed = fieldValue
      if (typeof fieldValue === 'string') {
        parsed = safeParseJSON(fieldValue)
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

      const isEmpty = !fieldValue || (typeof fieldValue === 'string' && (fieldValue === "" || fieldValue === "{}" || fieldValue === "[]"))
      setIsEditMode(source === 'record' ? (isEmpty ? true : false) : true)

      setIsNestedModalOpen(true)
    }
  }

  const openCellDataModal = (columnName, parsedData) => {
    setCellModalData({ columnName, data: parsedData })
    setIsCellDataModalOpen(true)
  }

  const formatFieldValue = (rawValue, dataType, column = null, record = null) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return <span className="text-muted-foreground italic">-</span>
    }

    const fieldType = getColumnFieldType(column) || dataType || 'text'
    const parsed = safeParseJSON(rawValue)

    let valueToDisplay = rawValue
    if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
      valueToDisplay = parsed.value
    } else if (parsed !== undefined) {
      valueToDisplay = parsed
    }

    if (fieldType === 'phone') {
      const phoneDisplay = formatPhoneDisplay(rawValue)
      const phoneParsed = safeParseJSON(rawValue)
      const phoneData = phoneParsed && typeof phoneParsed === 'object' ? phoneParsed : null
      if (phoneData && (phoneData.country || phoneData.dial_code || phoneData.number || phoneData.countryCode || (phoneData.value && typeof phoneData.value === 'object'))) {
        return (
          <button
            type="button"
            onClick={() => openCellDataModal(column?.column_name || 'Phone', phoneData.value && typeof phoneData.value === 'object' ? phoneData.value : phoneData)}
            className="text-blue-600 hover:underline text-left"
            title="Click to view full details"
          >
            {phoneDisplay}
          </button>
        )
      }
      return phoneDisplay
    }
    if (fieldType === 'location') {
      const locationDisplay = formatLocationDisplay(rawValue)
      const locParsed = safeParseJSON(rawValue)
      const locData = locParsed && typeof locParsed === 'object' ? (locParsed.value && typeof locParsed.value === 'object' ? locParsed.value : locParsed) : null
      if (locData && (locData.country || locData.state || locData.city)) {
        return (
          <button
            type="button"
            onClick={() => openCellDataModal(column?.column_name || 'Location', locData)}
            className="text-blue-600 hover:underline text-left"
            title="Click to view full details"
          >
            {locationDisplay}
          </button>
        )
      }
      return locationDisplay
    }

    // Handle Arrays (Multi-select)
    if (Array.isArray(valueToDisplay)) {
      const hasNested = valueToDisplay.some(
        (item) => item && typeof item === "object" && item.nestedValues && Object.keys(item.nestedValues).length > 0,
      )

      const badgesNode = (
        <div className="flex flex-wrap gap-1">
          {valueToDisplay.map((item, i) => {
            const displayItem = (typeof item === 'object' && item !== null) ? (item.label || item.value || JSON.stringify(item)) : String(item)
            return (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {displayItem}
              </Badge>
            )
          })}
        </div>
      )

      const onOpenNested = (hasNested || hasNestedData(column))
        ? () => openNestedModal({
          fieldValue: rawValue,
          column,
          recordId: record?.record_id,
          source: 'record',
        })
        : undefined

      if (onOpenNested) {
        return renderOptionsDropdown(
          badgesNode,
          column,
          valueToDisplay.map(v => typeof v === 'object' ? v.value : v),
          onOpenNested,
          record,
          parsed
        )
      }
      return badgesNode
    }

    // Handle interactive dropdowns for select/radio/checkbox with nested data
    const hasNested = (parsed && typeof parsed === 'object' && parsed.nestedValues &&
      Object.keys(parsed.nestedValues).length > 0)

    if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
      const displayNode = (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[200px]">
            {typeof valueToDisplay === 'object' ? JSON.stringify(valueToDisplay) : String(valueToDisplay)}
          </span>
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
        String(typeof valueToDisplay === 'object' ? (valueToDisplay.value || valueToDisplay.label || JSON.stringify(valueToDisplay)) : valueToDisplay),
        hasNestedData(column)
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

    // Fallback switch for other types
    switch (fieldType) {
      case 'email':
        return (
          <a href={`mailto:${valueToDisplay}`} className="text-blue-600 hover:underline">
            {String(valueToDisplay)}
          </a>
        )
      case 'boolean':
        return (
          <Badge variant={String(valueToDisplay) === 'true' || valueToDisplay === true ? 'default' : 'secondary'}>
            {String(valueToDisplay) === 'true' || valueToDisplay === true ? 'Yes' : 'No'}
          </Badge>
        )
      case 'date':
      case 'datetime': {
        const formatted = formatDateOnly(valueToDisplay)
        return <span>{formatted || String(valueToDisplay)}</span>
      }
      case 'file':
        if (typeof valueToDisplay === "string" && valueToDisplay.startsWith("data:")) {
          const fileName = inferFilenameFromDataUrl(valueToDisplay, column)
          return (
            <button
              onClick={() => openFileModal(valueToDisplay, column)}
              className="text-blue-600 hover:underline text-sm font-medium"
              title="Click to preview/download"
            >
              {fileName}
            </button>
          )
        }
        return <span className="truncate max-w-[200px]">{String(valueToDisplay)}</span>
      case 'number':
      case 'textarea':
      case 'text':
      default:
        if (typeof valueToDisplay === 'object' && valueToDisplay !== null) {
          if (valueToDisplay.countryCode || valueToDisplay.dial_code || valueToDisplay.number) {
            return (
              <button
                type="button"
                onClick={() => openCellDataModal(column?.column_name || 'Phone', valueToDisplay)}
                className="text-blue-600 hover:underline text-left"
                title="Click to view full details"
              >
                {formatPhoneDisplay(valueToDisplay)}
              </button>
            )
          }
          if (valueToDisplay.address || valueToDisplay.city || valueToDisplay.state || valueToDisplay.country) {
            return (
              <button
                type="button"
                onClick={() => openCellDataModal(column?.column_name || 'Location', valueToDisplay)}
                className="text-blue-600 hover:underline text-left"
                title="Click to view full details"
              >
                {formatLocationDisplay(valueToDisplay)}
              </button>
            )
          }
          const objKeys = Object.keys(valueToDisplay)
          const previewText = objKeys.slice(0, 2).map(k => `${k}: ${String(valueToDisplay[k]).slice(0, 20)}`).join(', ')
          return (
            <button
              type="button"
              onClick={() => openCellDataModal(column?.column_name || 'Data', valueToDisplay)}
              className="text-blue-600 hover:underline text-left text-xs"
              title="Click to view full details"
            >
              {previewText || '{...}'}
            </button>
          )
        }
        return <span className="truncate max-w-[200px]">{String(valueToDisplay)}</span>
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

      const gIds = authUtils.getGIds()
      const pId = authUtils.getPIds()
      const gId = authUtils.getGId()

      const payload = {
        g_id: gId,
        g_ids: gIds,
        p_id: pId,
        field_values: {
          [currentColumnId]: fieldValueString
        }
      }

      if (nestedModalContext === 'record') {
        const response = await recordsApi.updateNested(
          table.table_id,
          currentRecordId,
          payload
        )

        if (response.data) {
          toast.success('Record updated successfully!')
          setIsEditMode(false)
          setIsNestedModalOpen(false)
          setNestedModalContext('record')
          await fetchTableData(true)
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

                  const parsedValue = safeParseJSON(value)
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
  const safeRecords = useMemo(() => Array.isArray(records) ? records : [], [records])

  // Derive unique values for filter chips
  const { uniqueStages, uniqueSources, uniqueOwners } = useMemo(() => {
    return {
      uniqueStages: [...new Set(safeRecords.map(r => r.lead_stage).filter(Boolean))],
      uniqueSources: [...new Set(safeRecords.map(r => r.lead_source || r.source).filter(Boolean))],
      uniqueOwners: [...new Set(safeRecords.map(r => r.assigned_to).filter(s => s && s !== 'NA'))]
    }
  }, [safeRecords]);

  // Pipeline stats derived from records
  const totalLeads = safeRecords.length

  // Weekly trend logic
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentLeads = safeRecords.filter(r => new Date(r.created_at || Date.now()) >= oneWeekAgo)
  const recentLeadsCount = recentLeads.length

  const hotLeads = safeRecords.filter(r => r.lead_score != null && parseFloat(r.lead_score) >= 70).length

  const avgScore = safeRecords.length > 0
    ? Math.round(safeRecords.reduce((sum, r) => sum + (parseFloat(r.lead_score) || 0), 0) / safeRecords.length)
    : 0

  const oldLeads = safeRecords.filter(r => new Date(r.created_at || Date.now()) < oneWeekAgo)
  const oldAvgScore = oldLeads.length > 0
    ? Math.round(oldLeads.reduce((sum, r) => sum + (parseFloat(r.lead_score) || 0), 0) / oldLeads.length)
    : avgScore
  const avgScoreTrend = avgScore - oldAvgScore

  const pipelineValue = safeRecords.reduce((sum, r) => sum + (parseFloat(r.deal_value || r.value || 0) || 0), 0)
  const recentPipelineValue = recentLeads.reduce((sum, r) => sum + (parseFloat(r.deal_value || r.value || 0) || 0), 0)

  const staleLeads = safeRecords.filter(r => {
    const last = r.updated_at || r.created_at
    if (!last) return false
    return (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24) > 7
  }).length

  const stageColorConfig = {
    new: { dot: 'bg-gray-400', bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700 border-gray-200', chart: '#9ca3af' },
    contacted: { dot: 'bg-blue-500', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200', chart: '#3b82f6' },
    qualified: { dot: 'bg-purple-500', bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 border-purple-200', chart: '#a855f7' },
    proposal: { dot: 'bg-amber-500', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', chart: '#f59e0b' },
    negotiation: { dot: 'bg-orange-500', bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200', chart: '#f97316' },
    won: { dot: 'bg-green-500', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700 border-green-200', chart: '#22c55e' },
    lost: { dot: 'bg-red-500', bar: 'bg-red-400', badge: 'bg-red-100 text-red-700 border-red-200', chart: '#ef4444' },
  }

  // Sort stages consistently by minimum score ascending
  const sortedStages = stages.length > 0
    ? [...stages].sort((a, b) => (a.min_score || 0) - (b.min_score || 0))
    : []

  // Stage distribution for bar chart
  const stageOrder = sortedStages.length > 0
    ? sortedStages.map(s => s.stage_name || s.name || s.label).filter(Boolean)
    : ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
  const stageDistribution = stageOrder.map(s => ({
    stage: s,
    count: safeRecords.filter(r => s && r.lead_stage?.toLowerCase() === s.toLowerCase()).length
  }))
  const maxStageCount = Math.max(...stageDistribution.map(s => s.count), 1)

  // Score distribution buckets
  const fallbackMapping = [
    { label: '0–19', min: 0, max: 19, color: 'bg-gray-400', customColour: null, name: 'New' },
    { label: '20–39', min: 20, max: 39, color: 'bg-blue-500', customColour: null, name: 'Contacted' },
    { label: '40–59', min: 40, max: 59, color: 'bg-purple-500', customColour: null, name: 'Qualified' },
    { label: '60–74', min: 60, max: 74, color: 'bg-amber-500', customColour: null, name: 'Proposal' },
    { label: '75–89', min: 75, max: 89, color: 'bg-orange-500', customColour: null, name: 'Negotiation' },
    { label: '90–100', min: 90, max: 100, color: 'bg-green-500', customColour: null, name: 'Won' },
  ]

  const stageBuckets = sortedStages.length > 0
    ? sortedStages.map(s => {
      const stageName = s.stage_name || s.name || s.label
      const sc = stageColorConfig[stageName?.toLowerCase()] || stageColorConfig.new
      const customColour = s.colour || null
      return {
        label: `${s.min_score}–${s.max_score}`,
        min: s.min_score,
        max: s.max_score,
        color: customColour ? null : (sc.dot || 'bg-gray-400'),
        customColour,
        name: stageName
      }
    })
    : fallbackMapping

  const scoreBuckets = stageBuckets.map(b => ({
    ...b,
    count: safeRecords.filter(r => {
      const s = parseFloat(r.lead_score)
      return !isNaN(s) && s >= b.min && s <= b.max
    }).length
  }))
  const maxBucketCount = Math.max(...scoreBuckets.map(b => b.count), 1)

  // Dynamic Avg Score Trend Data for Current Month
  const currentMonthName = useMemo(() => new Date().toLocaleString('default', { month: 'short' }), []);
  const avgScoreTrendData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const groupedByDay = {};
    safeRecords.forEach(r => {
      if (!r.created_at || r.lead_score == null) return;
      const date = new Date(r.created_at);
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        const day = date.getDate().toString();
        if (!groupedByDay[day]) groupedByDay[day] = { sum: 0, count: 0 };
        groupedByDay[day].sum += parseFloat(r.lead_score) || 0;
        groupedByDay[day].count += 1;
      }
    });

    const sortedDays = Object.keys(groupedByDay).sort((a, b) => parseInt(a) - parseInt(b));
    if (sortedDays.length === 0) {
      return [{ date: now.getDate().toString(), score: 0 }];
    }

    return sortedDays.map(day => ({
      date: day,
      score: Math.round(groupedByDay[day].sum / groupedByDay[day].count)
    }));
  }, [safeRecords]);

  // Filter records
  const filteredRecords = safeRecords.filter(record => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      let matchesSearch = false
      if (record.field_values) {
        if (Object.values(record.field_values).some(v => v && String(v).toLowerCase().includes(searchLower))) matchesSearch = true
      }
      if (record.record_id && record.record_id.toLowerCase().includes(searchLower)) matchesSearch = true
      if (!matchesSearch) return false
    }
    // Stage filter
    if (selectedStages.length > 0 && !selectedStages.includes(record.lead_stage)) return false
    // Source filter
    const recordSource = record.lead_source || record.source
    if (selectedSources.length > 0 && !selectedSources.includes(recordSource)) return false
    // Owner filter
    if (selectedOwners.length > 0 && !selectedOwners.includes(record.assigned_to)) return false
    // Score range filter
    const score = record.lead_score != null ? parseFloat(record.lead_score) : null
    if (score !== null && !isNaN(score) && (score < scoreRange[0] || score > scoreRange[1])) return false
    // Hot leads filter
    if (showHotLeads && (score == null || score < 75)) return false
    // Stale filter
    if (showStaleLeads) {
      const last = record.updated_at || record.created_at
      if (last && (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24) < 7) return false
    }
    return true
  })

  // Apply sorting
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortConfig.direction === 'none' || !sortConfig.key) return 0

    let valA, valB

    if (["assigned_to", "updated_by", "created_at", "updated_at"].includes(sortConfig.key)) {
      valA = a[sortConfig.key]
      valB = b[sortConfig.key]
    } else {
      valA = getFieldValue(a, sortConfig.key)
      valB = getFieldValue(b, sortConfig.key)

      // If it's an object (like select/radio), use the nested 'value'
      if (valA && typeof valA === 'object' && valA.value !== undefined) valA = valA.value
      if (valB && typeof valB === 'object' && valB.value !== undefined) valB = valB.value
    }

    if (valA === null || valA === undefined) valA = ''
    if (valB === null || valB === undefined) valB = ''

    // Handle numeric strings
    if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
      valA = Number(valA)
      valB = Number(valB)
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  // Pagination calculations - Simplified for server-side
  const currentPageRecords = sortedRecords

  // Pagination handlers
  const goToPreviousPage = () => {
    const prevCursor = records[0]?.record_id || records[0]?.id || null
    if (prevCursor) {
      setCurrentPage(p => Math.max(p - 1, 1))
      fetchTableData({ prev: prevCursor, limit: pagination.limit || 10, silent: false })
    }
  }

  const goToNextPage = () => {
    const nextCursor = records[records.length - 1]?.record_id || records[records.length - 1]?.id || null
    if (nextCursor) {
      setCurrentPage(p => p + 1)
      fetchTableData({ next: nextCursor, limit: pagination.limit || 10, silent: false })
    }
  }

  // Create dynamic columns based on API response
  const createDynamicColumns = () => {
    if (!columns.length) return []

    const dynamicColumns = columns.map((column) => ({
      accessorKey: column.column_id,
      header: column.column_name,
    }))

    const metadataColumns = [
      {
        accessorKey: "lead_score",
        header: "Lead Score",
      },
      {
        accessorKey: "lead_score_percentage",
        header: "Lead Score %",
      },
      {
        accessorKey: "lead_stage",
        header: "Lead Stage",
      },
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



  if (loading && safeRecords.length === 0) {
    return (
      <div className="space-y-6 w-full max-w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-32" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[1, 2, 3, 4, 5].map(i => (
                      <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5].map(j => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  return (
    <div className="space-y-0 w-full max-w-full overflow-x-hidden">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="mb-4">
            <PageBreadcrumb
              customItems={[
                { label: 'Data Tables', href: '/leadPage', onClick: (e) => { e.preventDefault(); onBack() } },
                { label: table?.table_name || 'Table Data', href: '#' }
              ]}
            />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 rounded-full hover:bg-muted" onClick={onBack} title="Back to Tables">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-extrabold tracking-tight">{table?.table_name || 'Leads'}</h1>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-semibold px-2.5 py-0.5">Pipeline</Badge>
          </div>

        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground border rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Button variant="outline" size="sm" className="gap-1.5 h-9"
            onClick={() => { fetchTableData(true); setLastUpdated(new Date()) }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Scores
          </Button>
          <Button size="sm" className="gap-1.5 h-9" onClick={openAddRecordDialog}>
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      {/* ── ERROR DISPLAY ── */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => fetchTableData(true)} className="h-8">Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── 5 STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5 mt-2">
        {/* Total Leads */}
        <Card className="border shadow-sm bg-blue-50/40">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Leads</p>
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              {loading ? <Skeleton className="h-6 w-12" /> : <p className="text-xl font-extrabold tracking-tight">{totalLeads}</p>}
              <p className="text-[10px] text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-0.5" /> +{recentLeadsCount} this wk
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hot Leads */}
        <Card className="border shadow-sm bg-orange-50/40">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hot Leads</p>
              <Flame className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div className="flex items-baseline gap-2">
              {loading ? <Skeleton className="h-6 w-12" /> : <p className="text-xl font-extrabold tracking-tight">{hotLeads}</p>}
              <p className="text-[10px] text-muted-foreground flex items-center">
                Score ≥ 70
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Avg Lead Score */}
        <Card className="border shadow-sm bg-purple-50/40">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Avg Score</p>
              <BarChart2 className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              {loading ? <Skeleton className="h-6 w-12" /> : <p className="text-xl font-extrabold tracking-tight">{avgScore}</p>}
              <p className={`text-[10px] flex items-center ${avgScoreTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                <TrendingUp className={`h-3 w-3 mr-0.5 ${avgScoreTrend < 0 ? 'rotate-180' : ''}`} />
                {avgScoreTrend > 0 ? '+' : ''}{avgScoreTrend} vs prev
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Value */}
        <Card className="border shadow-sm bg-green-50/40">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pipeline Val</p>
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
            </div>
            <div className="flex items-baseline gap-2">
              {loading ? <Skeleton className="h-6 w-12" /> : (
                <p className="text-xl font-extrabold tracking-tight">
                  {pipelineValue > 0 ? `$${pipelineValue >= 1000 ? Math.round(pipelineValue / 1000) + 'K' : pipelineValue}` : '$0'}
                </p>
              )}
              {recentPipelineValue > 0 && (
                <p className="text-[10px] text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> +${recentPipelineValue >= 1000 ? Math.round(recentPipelineValue / 1000) + 'K' : recentPipelineValue}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stale Leads */}
        <Card className="border shadow-sm relative overflow-hidden bg-red-50/40">
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stale Leads</p>
              <Clock className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="flex items-baseline gap-2">
              {loading ? <Skeleton className="h-6 w-12" /> : <p className="text-xl font-extrabold tracking-tight text-red-600">{staleLeads}</p>}
              <p className="text-[10px] text-red-500 flex items-center">
                <TriangleAlert className="h-3 w-3 mr-0.5" /> &gt; 1 week
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── LEAD INSIGHTS SECTION ── */}
      <Card className="border shadow-sm mb-5">
        <div
          className="flex items-center justify-between px-5 py-0 cursor-pointer select-none"
          onClick={() => setShowInsights(!showInsights)}
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">Lead Insights</span>
            <span className="text-muted-foreground text-sm">— Stage distribution, score buckets, avg score trend</span>
          </div>
          <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform ${showInsights ? '' : 'rotate-180'}`} />
        </div>

        {showInsights && (
          <div className="border-t bg-muted/5">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x border-b lg:border-none">

              {/* Stage Distribution Bar Chart */}
              <div className="p-6 h-full flex flex-col bg-blue-50/20">
                <h4 className="text-[13px] font-semibold text-foreground mb-auto">Stage Distribution</h4>
                <div className="relative h-40 w-full mt-6 shrink-0">
                  <ChartContainer
                    config={{
                      count: {
                        label: "Leads",
                        theme: {
                          light: "hsl(var(--primary))",
                          dark: "hsl(var(--primary))",
                        },
                      },
                    }}
                    className="h-full w-full"
                  >
                    <RechartsBarChart
                      data={stageDistribution}
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="stage"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        fontSize={10}
                        fontWeight={500}
                        tickFormatter={(value) => value.length > 8 ? `${value.slice(0, 8)}...` : value}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        fontSize={10}
                        allowDecimals={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar
                        dataKey="count"
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                      >
                        {stageDistribution.map((entry, index) => {
                          const sc = stageColorConfig[entry.stage.toLowerCase()] || stageColorConfig.new
                          const stageObj = sortedStages.find(s => (s.stage_name || s.name || s.label)?.toLowerCase() === entry.stage?.toLowerCase())
                          const barColour = stageObj?.colour || sc.chart || 'hsl(var(--primary))'
                          return <Cell key={`cell-${index}`} fill={barColour} fillOpacity={0.9} />
                        })}
                      </Bar>
                    </RechartsBarChart>
                  </ChartContainer>
                </div>
              </div>

              {/* Score Distribution */}
              <div className="p-6 h-full flex flex-col bg-indigo-50/20">
                <h4 className="text-[13px] font-semibold text-foreground mb-auto">Score Distribution</h4>
                <div className="space-y-3 mt-6 shrink-0">
                  {scoreBuckets.map(({ label, color, customColour, count, name }) => (
                    <div key={label} className="flex items-center gap-3 p-1 -m-1 rounded hover:bg-muted/40 transition-colors group cursor-pointer" title={`${name}: ${count} leads in score range ${label}`}>
                      <span className="text-[10px] text-muted-foreground w-10 shrink-0 tabular-nums">{label}</span>
                      <div className="flex-1 h-3.5 bg-muted/50 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all group-hover:brightness-110 ${customColour ? '' : (color || 'bg-gray-400')}`}
                          style={customColour ? { backgroundColor: customColour, width: maxBucketCount > 0 ? `${(count / maxBucketCount) * 100}%` : '0%' } : { width: maxBucketCount > 0 ? `${(count / maxBucketCount) * 100}%` : '0%' }}
                        />
                      </div>
                      <div className="w-[72px] shrink-0 flex items-center gap-1.5">
                        {customColour
                          ? <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: customColour }} />
                          : <span className={`h-2 w-2 rounded-full ${color || 'bg-gray-400'}`} />}
                        <span className="text-xs font-bold tabular-nums text-foreground">{count}</span>
                        <span className="text-[10px] font-medium text-muted-foreground truncate capitalize">{name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avg Score Trend */}
              <div className="p-6 h-full flex flex-col relative bg-violet-50/20">
                <h4 className="text-[13px] font-semibold text-foreground mb-auto">
                  Avg Score Trend <span className="font-normal text-muted-foreground ml-1">({new Date().toLocaleString('default', { month: 'short', year: 'numeric' })})</span>
                </h4>
                <div className="relative h-40 w-full mt-6 shrink-0">
                  <ChartContainer
                    config={{
                      score: {
                        label: "Avg Score",
                        theme: {
                          light: "oklch(0.58 0.09 200)",
                          dark: "oklch(0.58 0.09 200)",
                        },
                      },
                    }}
                    className="h-full w-full"
                  >
                    <RechartsAreaChart
                      data={avgScoreTrendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-score)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="var(--color-score)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        fontSize={10}
                        fontWeight={500}
                        tickFormatter={(value) => `${currentMonthName} ${value}`}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        fontSize={10}
                        domain={[0, 100]}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="var(--color-score)"
                        fill="url(#colorScore)"
                        strokeWidth={2.5}
                      />
                    </RechartsAreaChart>
                  </ChartContainer>
                </div>
              </div>

            </div>
          </div>
        )}
      </Card>

      {/* ── SEARCH + QUICK FILTERS BAR ── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search leads, companies, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-10 border rounded-lg text-sm bg-background border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {searchTerm && (
            <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setSearchTerm("")} />
          )}
        </div>
        <Button
          variant={showHotLeads ? "default" : "outline"} size="sm"
          className={`h-10 gap-1.5 ${showHotLeads ? "bg-orange-500 hover:bg-orange-600 border-orange-500 text-white" : "text-orange-600 border-orange-200 hover:bg-orange-50"}`}
          onClick={() => { setShowHotLeads(v => !v); setShowStaleLeads(false) }}
        >
          <Flame className="h-3.5 w-3.5" /> Hot Leads
        </Button>
        <Button
          variant={showStaleLeads ? "default" : "outline"} size="sm"
          className={`h-10 gap-1.5 ${showStaleLeads ? "bg-red-500 hover:bg-red-600 border-red-500 text-white" : "text-red-500 border-red-200 hover:bg-red-50"}`}
          onClick={() => { setShowStaleLeads(v => !v); setShowHotLeads(false) }}
        >
          <Clock className="h-3.5 w-3.5" /> Stale
        </Button>
        <Button
          variant={showFilters ? "default" : "outline"} size="sm"
          className="h-10 gap-1.5"
          onClick={() => setShowFilters(v => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          {(selectedStages.length + selectedSources.length + selectedOwners.length) > 0 && (
            <span className="ml-0.5 h-4 min-w-[16px] px-0.5 bg-white text-primary text-[10px] font-bold rounded-full flex items-center justify-center">
              {selectedStages.length + selectedSources.length + selectedOwners.length}
            </span>
          )}
        </Button>
        <span className="ml-auto text-sm text-muted-foreground font-medium">{filteredRecords.length} of {safeRecords.length} leads</span>
      </div>

      {/* ── EXPANDED FILTER PANEL ── */}
      {showFilters && (
        <Card className="border shadow-sm mb-3">
          <CardContent className="p-5 space-y-4">
            {/* Stage */}
            {uniqueStages.length > 0 && (
              <div className="flex flex-wrap items-start gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground min-w-[55px] pt-1.5">STAGE</span>
                <div className="flex flex-wrap gap-2">
                  {uniqueStages.map(stage => {
                    const isActive = selectedStages.includes(stage)
                    const sc = stageColorConfig[stage?.toLowerCase()] || stageColorConfig.new
                    const stageObj = sortedStages.find(s => (s.stage_name || s.name || s.label)?.toLowerCase() === stage?.toLowerCase())
                    const customColour = stageObj?.colour || null
                    return (
                      <button key={stage} onClick={() => setSelectedStages(prev => isActive ? prev.filter(s => s !== stage) : [...prev, stage])}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isActive ? (customColour ? 'ring-2 ring-offset-1 bg-opacity-20' : cn(sc.badge, 'ring-2 ring-offset-1')) : 'bg-background border-border text-foreground hover:border-muted-foreground'}`}
                        style={isActive && customColour ? { backgroundColor: `${customColour}20`, borderColor: customColour, color: customColour, ringColor: customColour } : {}}
                      >
                        {customColour
                          ? <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: customColour }} />
                          : <span className={`h-2 w-2 rounded-full ${sc.dot}`} />}
                        {stage}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Source */}
            {uniqueSources.length > 0 && (
              <div className="flex flex-wrap items-start gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground min-w-[55px] pt-1.5">SOURCE</span>
                <div className="flex flex-wrap gap-2">
                  {uniqueSources.map(source => {
                    const isActive = selectedSources.includes(source)
                    return (
                      <button key={source} onClick={() => setSelectedSources(prev => isActive ? prev.filter(s => s !== source) : [...prev, source])}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:border-muted-foreground'}`}
                      >{source}</button>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Owner */}
            {uniqueOwners.length > 0 && (
              <div className="flex flex-wrap items-start gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground min-w-[55px] pt-1.5">OWNER</span>
                <div className="flex flex-wrap gap-2">
                  {uniqueOwners.map(ownerId => {
                    const isActive = selectedOwners.includes(ownerId)
                    const user = users.find(u => (u.user_id || u.id) === ownerId)
                    const name = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name || user.email || ownerId) : ownerId
                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <button key={ownerId} onClick={() => setSelectedOwners(prev => isActive ? prev.filter(o => o !== ownerId) : [...prev, ownerId])}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:border-muted-foreground'}`}
                      >
                        <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">{initials}</span>
                        {name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Score Range */}
            <div className="flex flex-wrap items-center gap-4 pt-1 border-t">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                SCORE RANGE: {scoreRange[0]}–{scoreRange[1]}
              </span>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} value={scoreRange[0]} className="w-32 accent-primary"
                  onChange={e => setScoreRange(prev => [Math.min(Number(e.target.value), prev[1] - 1), prev[1]])} />
                <span className="text-xs text-muted-foreground">to</span>
                <input type="range" min={0} max={100} value={scoreRange[1]} className="w-32 accent-primary"
                  onChange={e => setScoreRange(prev => [prev[0], Math.max(Number(e.target.value), prev[0] + 1)])} />
              </div>
              {(selectedStages.length > 0 || selectedSources.length > 0 || selectedOwners.length > 0 || scoreRange[0] > 0 || scoreRange[1] < 100) && (
                <button onClick={() => { setSelectedStages([]); setSelectedSources([]); setSelectedOwners([]); setScoreRange([0, 100]) }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground underline">Clear all</button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ALL LEADS TABLE CARD ── */}
      <Card className="overflow-hidden border shadow-sm py-0 gap-1">
        {/* Table toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">All Leads</span>
            <Badge variant="secondary" className="font-semibold">{filteredRecords.length}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 border-muted-foreground/20">
                  <Settings className="h-4 w-4" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px] max-h-[400px] overflow-y-auto">
                {createDynamicColumns().map(col => {
                  const colId = col.accessorKey || col.id
                  return (
                    <DropdownMenuCheckboxItem key={colId} className="capitalize"
                      checked={columnVisibility[colId] !== false}
                      onSelect={e => e.preventDefault()}
                      onCheckedChange={v => setColumnVisibility(prev => ({ ...prev, [colId]: !!v }))}
                    >{col.header}</DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 border-muted-foreground/20"
              onClick={() => {
                const rows = [['ID', ...columns.map(c => c.column_name), 'Score', 'Stage', 'Source', 'Owner', 'Created At'],
                ...sortedRecords.map(r => [r.record_id, ...columns.map(c => { const v = getFieldValue(r, c.column_id, c); return v != null ? String(v) : '' }), r.lead_score ?? '', r.lead_stage ?? '', r.lead_source ?? r.source ?? '', r.assigned_to ?? '', r.created_at ?? ''])]
                const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
                const a = document.createElement('a'); a.href = url; a.download = `${table?.table_name || 'leads'}.csv`; a.click(); URL.revokeObjectURL(url)
              }}
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="h-9 gap-1.5" onClick={openAddRecordDialog}>
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
          </div>
        </div>

        {/* Dynamic Score → Stage legend */}
        {scoreBuckets && scoreBuckets.length > 0 && (
          <div className="px-5 py-2.5 border-b bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="font-semibold text-foreground"> Stage→Score:</span>
            {scoreBuckets.map((bucket) => (
              <span key={bucket.name} className="flex items-center gap-1">
                {bucket.customColour
                  ? <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: bucket.customColour }} />
                  : <span className={cn("h-2 w-2 rounded-full", bucket.color)} />}
                <span className="font-semibold text-foreground">{bucket.name}</span>
                <span className="text-muted-foreground">{bucket.label}</span>
              </span>
            ))}
            <span className="ml-auto text-muted-foreground italic text-[11px]">— Stages from Strategy Configuration</span>
          </div>
        )}

        <CardContent className="p-0">
          {(() => {
            const tableColumns = createDynamicColumns()

            if (filteredRecords.length === 0) {
              return (
                <div className="text-center py-14 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-semibold">No leads found</p>
                  <p className="text-sm mt-1">{safeRecords.length === 0 ? 'No records in this table yet.' : 'Try adjusting your search or filters.'}</p>
                </div>
              )
            }

            return (
              <div>
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 ">
                  <Table className="w-full min-w-max border-collapse py-0">
                    <TableHeader className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md">
                      <TableRow className="hover:bg-transparent border-b">
                        {tableColumns.filter(col => columnVisibility[col.accessorKey || col.id] !== false).map(column => {
                          const isSortable = column.id !== 'actions'
                          const isSorted = sortConfig.key === column.accessorKey
                          return (
                            <TableHead key={column.accessorKey || column.id}
                              className={cn('py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground border-r last:border-r-0 whitespace-nowrap',
                                isSortable && 'cursor-pointer hover:bg-muted/60 select-none',
                                column.id === 'actions' ? 'text-right w-[120px]' : '')}
                              onClick={() => isSortable && handleSort(column.accessorKey)}
                            >
                              <div className={cn('flex items-center gap-1', column.id === 'actions' ? 'justify-end' : '')}>
                                <span>{column.header}</span>
                                {isSortable && (isSorted
                                  ? (sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />)
                                  : <ArrowUpDown className="h-3 w-3 opacity-30" />
                                )}
                              </div>
                            </TableHead>
                          )
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPageRecords.map((record, recordIndex) => {
                        const isSelected = selectedRows.has(record.record_id)
                        const score = record.lead_score != null ? parseFloat(record.lead_score) : null
                        const isHot = score != null && score >= 75
                        const stage = record.lead_stage
                        const sc = stageColorConfig[stage?.toLowerCase()] || stageColorConfig.new
                        const stageObj = sortedStages.find(s => (s.stage_name || s.name || s.label)?.toLowerCase() === stage?.toLowerCase())
                        const stageCustomColour = stageObj?.colour || null


                        // Find name/email columns for lead cell
                        const nameCol = columns.find(c => c.column_name?.toLowerCase().includes('name') || c.column_name?.toLowerCase() === 'full name')
                        const nameValRaw = nameCol ? getFieldValue(record, nameCol.column_id, nameCol) : null
                        const nameVal = nameValRaw && typeof nameValRaw === 'object' && nameValRaw.value !== undefined ? nameValRaw.value : nameValRaw
                        const displayName = nameVal ? String(nameVal) : (record.record_id || '—')
                        const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

                        // Last activity label
                        const lastDate = record.updated_at || record.created_at
                        let activityLabel = '-'
                        let activityClass = 'text-muted-foreground'
                        if (lastDate) {
                          const ld = new Date(lastDate)
                          const now = new Date()
                          const lastDayStart = new Date(ld.getFullYear(), ld.getMonth(), ld.getDate()).getTime()
                          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
                          const days = Math.round((todayStart - lastDayStart) / 86400000)

                          if (days === 0) { activityLabel = 'Today'; activityClass = 'text-green-600 font-semibold' }
                          else if (days === 1) { activityLabel = 'Yesterday'; activityClass = 'text-green-600 font-semibold' }
                          else if (days > 1 && days < 7) { activityLabel = `${days}d ago`; activityClass = 'text-foreground font-medium' }
                          else { activityLabel = `${days < 0 ? 0 : days}d ago`; activityClass = 'text-red-500 font-medium' }
                        }

                        return (
                          <TableRow key={record.record_id || recordIndex}
                            className={cn('border-b transition-all duration-150 group',
                              isSelected ? 'bg-primary/5' : 'hover:bg-muted/30',
                              isHot ? 'border-l-[3px] border-l-orange-400' : 'border-l-[3px] border-l-transparent'
                            )}
                          >
                            {tableColumns.filter(col => columnVisibility[col.accessorKey || col.id] !== false).map(column => {
                              let cellContent = <span className="text-muted-foreground text-sm">-</span>

                              if (column.id === 'actions') {
                                cellContent = (
                                  <div className="flex items-center justify-end gap-0.5">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10" title="View"
                                      onClick={() => router.push(`/leadPage/record-details?table_id=${table.table_id}&record_id=${record.record_id}`)}>
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 text-blue-600" title="Create Activity"
                                      onClick={() => { setActivityInitialData({ related_table_id: table.table_id, related_record_id: record.record_id }); setIsCreateActivityOpen(true) }}>
                                      <CalendarPlus className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 text-blue-600" title="Activities"
                                      onClick={() => router.push(`/activities?related_table_id=${table.table_id}&related_record_id=${record.record_id}`)}>
                                      <ListTodo className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10" title="Delete"
                                      onClick={() => { setRecordToDelete(record); setIsDeleteDialogOpen(true) }}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                )
                              } else if (column.id === '__lead_cell__' || (nameCol && column.accessorKey === nameCol.column_id)) {
                                // Special lead cell with avatar + name + email + hot icon
                                cellContent = (
                                  <div className="flex items-center gap-3 min-w-[180px]">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-sm text-foreground truncate">{displayName}</span>
                                        {isHot && <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                                      </div>
                                    </div>
                                  </div>
                                )
                              } else if (column.accessorKey === 'lead_score') {
                                const scoreColor = stageCustomColour || sc.chart || 'hsl(var(--primary))'
                                cellContent = score != null ? (
                                  <div className="flex items-center gap-2 min-w-[110px]">
                                    <span className="text-sm font-bold tabular-nums w-7 shrink-0" style={{ color: scoreColor }}>
                                      {Math.round(score)}
                                    </span>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                          width: `${Math.min(100, score)}%`,
                                          backgroundColor: scoreColor
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : <span className="text-muted-foreground text-sm">-</span>
                              } else if (column.accessorKey === 'lead_score_percentage') {
                                const pct = record.lead_score_percentage
                                cellContent = pct != null ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-14 bg-muted h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-primary h-full" style={{ width: `${Math.min(100, Math.max(0, parseFloat(pct)))}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-primary">
                                      {Number(parseFloat(pct).toFixed(2))}%
                                    </span>
                                  </div>
                                ) : <span className="text-muted-foreground text-sm">-</span>
                              } else if (column.accessorKey === 'lead_stage') {
                                cellContent = stage ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="flex items-center gap-1 group/badge hover:opacity-80 transition-opacity focus:outline-none">
                                        {stageCustomColour ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                                            style={{ backgroundColor: `${stageCustomColour}18`, borderColor: `${stageCustomColour}50`, color: stageCustomColour }}>
                                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stageCustomColour }} />
                                            <span className="truncate max-w-[80px]">{stage}</span>
                                          </span>
                                        ) : (
                                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', sc.badge)}>
                                            <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} />
                                            <span className="truncate max-w-[80px]">{stage}</span>
                                          </span>
                                        )}
                                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover/badge:text-foreground transition-colors" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-[180px]">
                                      {sortedStages.length > 0 ? sortedStages.map(s => {
                                        const sName = s.stage_name || s.name || s.label
                                        const isCurrent = sName === stage
                                        const sCol = s.colour
                                        return (
                                          <DropdownMenuItem
                                            key={sName}
                                            onClick={() => handleStageUpdate(record.record_id, sName)}
                                            className={cn("flex items-center gap-2", isCurrent && "bg-muted font-bold")}
                                          >
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sCol || 'hsl(var(--muted-foreground))' }} />
                                            <span className="flex-1">{sName}</span>
                                            {isCurrent && <Check className="h-3.5 w-3.5 text-primary" />}
                                          </DropdownMenuItem>
                                        )
                                      }) : (
                                        ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(sName => (
                                          <DropdownMenuItem
                                            key={sName}
                                            onClick={() => handleStageUpdate(record.record_id, sName)}
                                            className={cn(sName === stage && "bg-muted font-bold")}
                                          >
                                            {sName}
                                          </DropdownMenuItem>
                                        ))
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : <span className="text-muted-foreground text-sm">-</span>
                              } else if (column.accessorKey === 'assigned_to') {
                                const assignedTo = record.assigned_to
                                if (!assignedTo || assignedTo === 'NA') {
                                  cellContent = <span className="text-sm text-muted-foreground">-</span>
                                } else {
                                  const user = users.find(u => (u.user_id || u.id) === assignedTo)
                                  const uName = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name || user.email || assignedTo) : assignedTo
                                  const uInitials = uName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                  cellContent = (
                                    <div className="flex items-center gap-2">
                                      <span className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">{uInitials}</span>
                                      <span className="text-sm">{uName}</span>
                                    </div>
                                  )
                                }
                              } else if (column.accessorKey === 'updated_by') {
                                const updatedBy = record.updated_by
                                if (!updatedBy) { cellContent = <span className="text-muted-foreground text-sm">-</span> }
                                else {
                                  const user = users.find(u => (u.user_id || u.id) === updatedBy)
                                  const uName = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name || user.email || updatedBy) : updatedBy
                                  cellContent = <span className="text-sm">{uName}</span>
                                }
                              } else if (column.accessorKey === 'created_at') {
                                const d = new Date(record.created_at)
                                cellContent = isNaN(d.getTime()) ? <span className="text-muted-foreground text-sm">-</span> : (
                                  <div className="text-sm">
                                    <div className="font-medium">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                    <div className="text-xs text-muted-foreground">{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                  </div>
                                )
                              } else if (column.accessorKey === 'updated_at') {
                                const d = new Date(record.updated_at || record.created_at)
                                cellContent = isNaN(d.getTime()) ? <span className="text-muted-foreground text-sm">-</span> : (
                                  <div className="text-sm">
                                    <div className={`font-medium ${activityClass}`}>
                                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                      <span className="ml-1 opacity-70">({activityLabel})</span>
                                    </div>
                                  </div>
                                )
                              } else {
                                const columnData = columns.find(c => c.column_id === column.accessorKey)
                                if (columnData) {
                                  const fv = getFieldValue(record, column.accessorKey, columnData)
                                  cellContent = formatFieldValue(fv, getColumnFieldType(columnData), columnData, record)
                                }
                              }

                              return (
                                <TableCell key={column.accessorKey || column.id}
                                  className={cn('px-4 py-3.5 text-sm border-r last:border-r-0 align-middle',
                                    column.id === 'actions' ? 'w-[120px]' : 'max-w-[280px]')}
                                >{cellContent}</TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Rows per page</span>
                    <Select
                      value={String(pagination?.limit || 10)}
                      onValueChange={(val) => {
                        setCurrentPage(1)
                        fetchTableData({ limit: Number(val) })
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8 border-muted-foreground/20 text-xs shadow-none rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[5, 10, 15, 20, 50].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground font-medium border-l pl-3">
                      Page <span className="text-foreground font-semibold">{currentPage}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentPage > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={loading}
                        className="gap-1 rounded-lg h-9 px-4"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={loading || records.length < (pagination?.limit || 10)}
                      className="gap-1 rounded-lg h-9 px-4"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
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
      </Dialog >

      <CreateActivityDialog
        open={isCreateActivityOpen}
        onOpenChange={setIsCreateActivityOpen}
        initialData={activityInitialData}
        currentUser={authUtils.getTokens()?.user}
      />

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
                        // Single selection
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

      {/* Cell Data View Modal */}
      <Dialog open={isCellDataModalOpen} onOpenChange={setIsCellDataModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {cellModalData.columnName}
            </DialogTitle>
            <DialogDescription>Complete data for this field</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cellModalData.data !== null && cellModalData.data !== undefined && (
              <CellDataRenderer data={cellModalData.data} />
            )}
          </div>
          <div className="px-6 py-4 border-t bg-muted/20 shrink-0 flex justify-end">
            <Button variant="outline" onClick={() => setIsCellDataModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>


      <RecordModal
        open={isEditRecordDialogOpen}
        onOpenChange={setIsEditRecordDialogOpen}
        table={{ ...table, columns }}
        countries={phoneCountries}
        recordToEdit={recordToEdit}
        onSuccess={() => fetchTableData(true)}
        users={users}
      />

      <RecordModal
        open={isAddRecordDialogOpen}
        onOpenChange={setIsAddRecordDialogOpen}
        table={{ ...table, columns }}
        countries={phoneCountries}
        onSuccess={() => fetchTableData(true)}
        users={users}
      />
    </div >
  )
}

function CellDataRenderer({ data, depth = 0 }) {
  if (data === null || data === undefined) {
    return <span className="text-muted-foreground italic text-sm">-</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-muted-foreground italic text-sm">Empty list</span>
    }
    return (
      <ul className={`space-y-2 ${depth > 0 ? 'mt-2 ml-4 pl-3 border-l-2 border-muted-foreground/20' : ''}`}>
        {data.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
            <div className="flex-1 text-sm">
              {typeof item === 'object' && item !== null
                ? <CellDataRenderer data={item} depth={depth + 1} />
                : <span className="text-foreground">{String(item)}</span>
              }
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) {
      return <span className="text-muted-foreground italic text-sm">Empty object</span>
    }
    return (
      <div className={`space-y-3 ${depth > 0 ? 'mt-2 ml-4 pl-3 border-l-2 border-muted-foreground/20' : ''}`}>
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-0.5">
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[80px]">{key}</span>
              {typeof value !== 'object' || value === null ? (
                <span className="text-sm text-foreground">{value === null || value === undefined ? '-' : String(value)}</span>
              ) : null}
            </div>
            {typeof value === 'object' && value !== null && (
              <CellDataRenderer data={value} depth={depth + 1} />
            )}
          </div>
        ))}
      </div>
    )
  }

  return <span className="text-sm text-foreground">{String(data)}</span>
}