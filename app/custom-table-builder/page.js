"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Plus, Edit, Save, X, Trash2, Settings, Settings2, Type, Hash, Calendar, CheckSquare,
  Database, Mail, Phone, Users, FileText, List, Calculator, User, Sparkles, GripVertical,
  Loader2, ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search,
  MoreHorizontal, Columns, Maximize2, Minimize2, MapPin, Box, Filter, MoreVertical,
  Check, ChevronsUpDown, Info, LayoutTemplate, UserPlus, Table as TableIcon, Download,
  History, Eye, ChevronDown, CheckCircle2, TrendingUp, AlertCircle, Clock, ArrowUpRight,
  Activity, Grid3X3, RefreshCw
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
// ... existing imports ...
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { v4 as uuidv4 } from 'uuid'
import { ColumnConfigPanel } from "./column-config-panel"
import { TableCreationWizard } from "./table-creation-wizard"
import { authUtils } from "@/lib/auth-utils"
import { recordsApi, datatablesApi } from "@/lib/api-endpoint" // Added recordsApi
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { fetchPhoneCountries, fetchCountries, fetchStates, fetchCities } from "@/lib/constants/location-api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'


// --- UI Helpers from Lead Page ---

const getStatusBadge = (isActive) => {
  return isActive ? (
    <Badge className="bg-emerald-100/50 text-emerald-700 border-none px-3 py-1 shadow-none font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Active
    </Badge>
  ) : (
    <Badge className="bg-slate-100 text-slate-500 border-none px-3 py-1 shadow-none font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Inactive
    </Badge>
  )
}

// ---------------------------------

const columnTypes = [
  // Essential Types
  { value: "text", label: "Text Input", icon: Type, category: "essential" },
  { value: "email", label: "Email", icon: Mail, category: "essential" },
  { value: "number", label: "Number", icon: Hash, category: "essential" },
  { value: "textarea", label: "Textarea", icon: FileText, category: "essential" },

  // Professional Types (Super Useful)
  { value: "select", label: "Select", icon: List, category: "super-useful" },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare, category: "super-useful" },
  { value: "radio", label: "Radio", icon: CheckSquare, category: "super-useful" },
  { value: "file", label: "File Upload", icon: FileText, category: "super-useful" },
  { value: "datetime", label: "Date Time", icon: Calendar, category: "super-useful" },
  { value: "phone", label: "Phone Number", icon: Phone, category: "super-useful" },

  // Custom Types
  { value: "location", label: "Location", icon: MapPin, category: "custom" },
]

const essentialTypes = columnTypes.filter(t => t.category === "essential")
const superUsefulTypes = columnTypes.filter(t => t.category === "super-useful")
const customTypes = columnTypes.filter(t => t.category === "custom")


const parseOptionalValuesArray = (optionalValuesInput) => {
  if (!optionalValuesInput) return []

  const tryParse = (value) => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch { return [] }
    }
    if (typeof value === 'object') return Array.isArray(value) ? value : []
    return []
  }

  if (Array.isArray(optionalValuesInput)) {
    for (const entry of optionalValuesInput) {
      const parsed = tryParse(entry)
      if (parsed.length) return parsed
    }
  }

  if (typeof optionalValuesInput === 'string') return tryParse(optionalValuesInput)
  return []
}

const getColumnFieldType = (column) => {
  if (!column) return 'text'
  // Prioritize properties.field_type or parent_datatype just like in table-data-view.js
  return (
    column.properties?.field_type ||
    column.parentDatatype || // Use the mapped parentDatatype
    column.parent_datatype ||
    column.data_type || // Include data_type for datetime/date support
    column.type || // fallback to mapped UI type
    'text'
  )
}

const getColumnOptions = (column) => {
  if (!column) return []
  if (Array.isArray(column.rawOptions) && column.rawOptions.length > 0) return column.rawOptions
  if (Array.isArray(column.options) && column.options.length > 0) {
    // Fallback or if options already parsed
    const first = column.options[0]
    if (typeof first === 'object') return column.options
  }
  // Try parsing if strict options not found
  return parseOptionalValuesArray(column.options)
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

// Table Settings Dialog
function TableSettingsDialog({ table, open, onOpenChange, onUpdate }) {
  const [name, setName] = useState(table.name)
  const [description, setDescription] = useState(table.description || "")
  const [isActive, setIsActive] = useState(table.isActive)
  const [isSaving, setIsSaving] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName(table.name)
      setDescription(table.description || "")
      setIsActive(table.isActive)
    }
  }, [open, table])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await onUpdate(table.id, {
        table_name: name,
        description: description,
        is_active: isActive
      })
      onOpenChange(false)
      toast.success("Table settings updated")
    } catch (error) {
      console.error("Error updating table settings:", error)
      toast.error("Failed to update table settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Table Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Table Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Display name" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this table..." />
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-0.5">
              <Label>Active Status</Label>
              <div className="text-xs text-muted-foreground">
                {isActive ? "Table is visible to users" : "Table is hidden from users"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="cursor-pointer hover:opacity-80"
                  >
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Change Table Status?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to {isActive ? "deactivate" : "activate"} the table
                      <span className="font-semibold text-foreground mx-1">"{name}"</span>?
                      {isActive
                        ? " Deactivating it will hide it from users."
                        : " Activating it will make it visible to users again."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => setIsActive(!isActive)}
                    >
                      {isActive ? "Deactivate" : "Activate"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Sortable Table Component
function SortableTable({ table, onTableClick, onDeleteTable, onAddColumn, onAddRow, currentTable, onUpdateColumns, onUpdateTables, tables, setTables, onToggleStatus, loading, onUpdateTableDetails, onFetchRecords, records, countries }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: table.id })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // -- Record Creation State (Lifted from TableContent) --
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false)
  const [recordFormData, setRecordFormData] = useState({})
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false)
  // ----------------------------------------------------

  const openAddRecordDialog = () => {
    const initialFormState = {}
    table.columns.forEach((column) => {
      const fieldType = getColumnFieldType(column)
      if (fieldType === 'checkbox') {
        initialFormState[column.id] = []
      } else if (fieldType === 'select' || fieldType === 'radio') {
        initialFormState[column.id] = { value: '', nestedValues: {} }
      } else if (fieldType === 'phone') {
        initialFormState[column.id] = { countryCode: column.validation?.defaultCountry || '+91', number: '' }
      } else if (fieldType === 'location') {
        initialFormState[column.id] = { country: undefined, state: undefined, city: undefined }
      } else {
        initialFormState[column.id] = ''
      }
    })
    setRecordFormData(initialFormState)
    setIsAddRecordDialogOpen(true)
  }

  // --- Nested State Updates ---
  const updateNestedState = (obj, path, value) => {
    if (path.length === 0) return value
    const [head, ...tail] = path
    const res = Array.isArray(obj) ? [...obj] : { ...obj }
    res[head] = updateNestedState(obj[head], tail, value)
    return res
  }

  const handleRecursiveFieldChange = (fieldId, newValue, path = []) => {
    setRecordFormData(prev => updateNestedState(prev, [...path, fieldId], newValue))
  }

  const handleRecursiveCheckboxToggle = (fieldId, optionValue, path = []) => {
    setRecordFormData(prev => {
      let currentData = prev
      for (const key of path) {
        currentData = currentData?.[key]
      }
      const currentValues = Array.isArray(currentData?.[fieldId]) ? currentData[fieldId] : []
      const index = currentValues.findIndex(item => (typeof item === 'object' ? item.value : item) === optionValue)

      let newFieldVal
      if (index > -1) {
        newFieldVal = [...currentValues]
        newFieldVal.splice(index, 1)
      } else {
        newFieldVal = [...currentValues, { value: optionValue, nestedValues: {} }]
      }
      return updateNestedState(prev, [...path, fieldId], newFieldVal)
    })
  }
  // -----------------------------

  const handleAddRecordSubmit = async () => {
    setIsSubmittingRecord(true)
    try {
      const tokens = authUtils.getTokens()
      const user = tokens?.user
      let gId = user?.g_ids && (Array.isArray(user.g_ids) ? user.g_ids[0] : user.g_ids)

      const gIds = authUtils.getGIds()
      const pIds = authUtils.getPIds()

      const fieldValues = {}
      for (const column of table.columns) {
        const value = recordFormData[column.id]
        if (value === null || value === undefined) continue

        const fieldType = getColumnFieldType(column)

        // Location specific handling
        if (fieldType === 'location') {
          if (value.country) {
            fieldValues[column.id] = buildFieldValuePayload(column, value)
          }
          continue
        }

        const payloadValue = buildFieldValuePayload(column, value)
        if (payloadValue !== null) {
          fieldValues[column.id] = payloadValue
        }
      }

      const payload = {
        g_id: gId || (gIds && gIds[0]),
        g_ids: gIds,
        p_id: pIds,
        field_values: fieldValues
      }

      const response = await recordsApi.create(table.id, payload)
      if (response.data) {
        toast.success("Record added successfully!")
        setIsAddRecordDialogOpen(false)
        if (onFetchRecords) onFetchRecords(table.id)
      }
    } catch (error) {
      console.error("Error adding record:", error)
      toast.error("Failed to add record")
    } finally {
      setIsSubmittingRecord(false)
    }
  }

  const renderFormFieldsRecursive = (fields, currentData, path = [], depth = 0) => {
    if (!fields || !Array.isArray(fields)) return null

    return fields.map((field) => {
      const fieldId = field.id || field.column_id
      const fieldType = getColumnFieldType(field)
      const fieldName = field.column_name || field.label || field.name
      const storedValue = currentData?.[fieldId]
      const columnOptions = field.options || [] // Nested keys usually have direct options

      const primitiveValue = (fieldType === 'select' || fieldType === 'radio')
        ? (storedValue?.value || '')
        : (typeof storedValue === 'object' ? JSON.stringify(storedValue) : String(storedValue || ''))

      // Location
      if (fieldType === 'location') {
        const locationVal = typeof storedValue === 'object' && storedValue !== null ? storedValue : {}
        return (
          <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1' : ''} space-y-2`}>
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {fieldName}
            </Label>
            <LocationPicker
              value={locationVal}
              onChange={val => handleRecursiveFieldChange(fieldId, val, path)}
              validation={field.validation || {}}
            />
          </div>
        )
      }

      // Phone
      if (fieldType === 'phone') {
        const phoneData = typeof storedValue === 'object' && storedValue !== null
          ? { countryCode: storedValue.countryCode || field.validation?.defaultCountry || '+91', number: storedValue.number || '' }
          : { countryCode: field.validation?.defaultCountry || '+91', number: storedValue || '' }
        return (
          <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1' : ''} space-y-2`}>
            <Label>{fieldName}</Label>
            <PhoneInput
              value={phoneData}
              onChange={val => handleRecursiveFieldChange(fieldId, val, path)}
              countries={countries}
            />
          </div>
        )
      }

      // Select
      if (fieldType === 'select' && columnOptions.length > 0) {
        const selectedOption = columnOptions.find(opt => {
          const val = typeof opt === 'object' ? (opt.value || opt.label) : opt
          return val === primitiveValue
        })
        const nestedFields = selectedOption?.nestedFields || []

        return (
          <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1' : ''} space-y-2`}>
            <Label>{fieldName}</Label>
            <Select value={primitiveValue} onValueChange={val => handleRecursiveFieldChange(fieldId, { value: val, nestedValues: {} }, path)}>
              <SelectTrigger><SelectValue placeholder={"Select " + fieldName} /></SelectTrigger>
              <SelectContent>
                {columnOptions.map((opt, i) => {
                  const val = typeof opt === 'object' ? (opt.value || opt.label) : opt
                  const label = typeof opt === 'object' ? (opt.label || opt.value) : opt
                  return (
                    <SelectItem key={i} value={val}>{label}</SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {nestedFields.length > 0 && primitiveValue && (
              <div className="mt-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Plus className="h-3 w-3" /> Nested Fields for {primitiveValue}
              </div>
            )}
            {nestedFields.length > 0 && primitiveValue && (
              <div className="mt-2">
                {renderFormFieldsRecursive(nestedFields, storedValue?.nestedValues || {}, [...path, fieldId, 'nestedValues'], depth + 1)}
              </div>
            )}
          </div>
        )
      }

      // Radio
      if (fieldType === 'radio' && columnOptions.length > 0) {
        const selectedOption = columnOptions.find(opt => {
          const val = typeof opt === 'object' ? (opt.value || opt.label) : opt
          return val === primitiveValue
        })
        const nestedFields = selectedOption?.nestedFields || []

        return (
          <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1' : ''} space-y-2`}>
            <Label>{fieldName}</Label>
            <RadioGroup value={primitiveValue} onValueChange={val => handleRecursiveFieldChange(fieldId, { value: val, nestedValues: {} }, path)}>
              <div className="grid gap-2">
                {columnOptions.map((opt, i) => {
                  const val = typeof opt === 'object' ? (opt.value || opt.label) : opt
                  const label = typeof opt === 'object' ? (opt.label || opt.value) : opt
                  const id = `radio-${fieldId}-${i}`
                  return (
                    <div key={i} className="flex items-center space-x-2">
                      <RadioGroupItem value={val} id={id} />
                      <Label htmlFor={id} className="font-normal cursor-pointer">{label}</Label>
                    </div>
                  )
                })}
              </div>
            </RadioGroup>

            {nestedFields.length > 0 && primitiveValue && (
              <div className="mt-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Plus className="h-3 w-3" /> Nested Fields for {primitiveValue}
              </div>
            )}
            {nestedFields.length > 0 && primitiveValue && (
              <div className="mt-2">
                {renderFormFieldsRecursive(nestedFields, storedValue?.nestedValues || {}, [...path, fieldId, 'nestedValues'], depth + 1)}
              </div>
            )}
          </div>
        )
      }

      // Checkbox
      if (fieldType === 'checkbox' && columnOptions.length > 0) {
        const checkboxSelections = Array.isArray(storedValue)
          ? storedValue.map(item => typeof item === 'object' ? item.value : item)
          : []

        return (
          <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1' : ''} space-y-3`}>
            <Label>{fieldName}</Label>
            <div className="space-y-2">
              {columnOptions.map((opt, i) => {
                const optVal = typeof opt === 'object' ? (opt.value || opt.label) : opt
                const optLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt
                const isChecked = checkboxSelections.includes(optVal)
                const selectionIdx = isChecked ? (storedValue || []).findIndex(s => (s.value || s) === optVal) : -1
                const id = `checkbox-${fieldId}-${i}`

                return (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={id}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          // Handle manual toggle since we want to pass specific args
                          handleRecursiveCheckboxToggle(fieldId, optVal, path)
                        }}
                      />
                      <Label htmlFor={id} className="font-normal cursor-pointer">{optLabel}</Label>
                    </div>
                    {isChecked && typeof opt === 'object' && opt.nestedFields && opt.nestedFields.length > 0 && selectionIdx !== -1 && (
                      <div className="mt-2 ml-6">
                        {renderFormFieldsRecursive(opt.nestedFields, (storedValue || [])[selectionIdx]?.nestedValues || {}, [...path, fieldId, selectionIdx, 'nestedValues'], depth + 1)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      // Default
      return (
        <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1' : ''} space-y-2`}>
          <Label>{fieldName}</Label>
          {fieldType === 'textarea' ? (
            <Textarea value={primitiveValue} onChange={e => handleRecursiveFieldChange(fieldId, e.target.value, path)} />
          ) : fieldType === 'number' ? (
            (() => {
              // Check if value is outside min/max range
              const numValue = parseFloat(primitiveValue)
              const isOutOfRange = primitiveValue && !isNaN(numValue) && (
                (field.validation?.min !== undefined && numValue < field.validation.min) ||
                (field.validation?.max !== undefined && numValue > field.validation.max)
              )
              return (
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      type="number"
                      value={primitiveValue}
                      onChange={e => handleRecursiveFieldChange(fieldId, e.target.value, path)}
                      min={field.validation?.min}
                      max={field.validation?.max}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={`pr-8 ${isOutOfRange ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {primitiveValue && (
                      <button
                        type="button"
                        onClick={() => handleRecursiveFieldChange(fieldId, '', path)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Clear input"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {isOutOfRange && (
                    <p className="text-xs text-red-500">
                      {field.validation?.min !== undefined && field.validation?.max !== undefined
                        ? `Value must be between ${field.validation.min} and ${field.validation.max}`
                        : field.validation?.min !== undefined
                          ? `Value must be at least ${field.validation.min}`
                          : `Value must be at most ${field.validation.max}`
                      }
                    </p>
                  )}
                </div>
              )
            })()
          ) : (
            <Input
              value={primitiveValue}
              onChange={e => handleRecursiveFieldChange(fieldId, e.target.value, path)}
              type={fieldType === 'email' ? 'email' : fieldType === 'date' ? 'date' : fieldType === 'datetime' ? 'datetime-local' : 'text'}
            />
          )}
        </div>
      )
    })
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 cursor-grab active:cursor-grabbing"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
              <CardTitle className="flex items-center gap-3 cursor-pointer" onClick={() => onTableClick(table)}>
                <Database className="h-5 w-5 text-primary" />
                {table.name}
                <Badge variant="secondary" className="text-xs">
                  {table.columns.length} columns × {table.rows.length} rows
                </Badge>
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setShowStatusConfirm(true)}>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    <span>{table.isActive ? "Deactivate" : "Activate"} Table</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onAddColumn}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Add Column</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Table Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openAddRecordDialog}>
                    <Database className="mr-2 h-4 w-4" />
                    <span>Add Record</span>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem onClick={() => onTableClick(table)}>
                    {currentTable?.id === table.id ? (
                      <>
                        <Minimize2 className="mr-2 h-4 w-4" />
                        <span>Collapse View</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="mr-2 h-4 w-4" />
                        <span>Expand View</span>
                      </>
                    )}
                  </DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Table</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Controlled Dialogs */}
              <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Change Table Status?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to {table.isActive ? "deactivate" : "activate"} the table
                      <span className="font-semibold text-foreground mx-1">"{table.name}"</span>?
                      {table.isActive
                        ? " Deactivating it will hide it from users."
                        : " Activating it will make it visible to users again."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onToggleStatus(table.id, table.isActive);
                        setShowStatusConfirm(false);
                      }}
                    >
                      {table.isActive ? "Deactivate" : "Activate"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the
                      table <span className="font-semibold text-foreground">"{table.name}"</span> and all of its records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onDeleteTable();
                        setShowDeleteConfirm(false);
                      }}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete Table
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>

        {currentTable?.id === table.id && (
          <TableContent
            table={table}
            onUpdateColumns={onUpdateColumns}
            onUpdateTables={onUpdateTables}
            tables={tables}
            setTables={setTables}
            onFetchRecords={onFetchRecords}
            onAddRecord={openAddRecordDialog}
            records={records}
            countries={countries}
          />
        )}
      </Card>

      {/* Add Record Modal (Moved from TableContent) */}
      <Dialog open={isAddRecordDialogOpen} onOpenChange={setIsAddRecordDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto w-full">
          <DialogHeader>
            <DialogTitle>Add New Record to {table.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {table.columns.map(column => {
              const fieldType = getColumnFieldType(column)
              const columnOptions = getColumnOptions(column)
              const fieldValue = recordFormData[column.id]

              // Main level render check for recursive types
              if (fieldType === 'checkbox' || fieldType === 'select' || fieldType === 'radio' || fieldType === 'location') {
                // Reuse the recursive function for top-level complex fields
                return renderFormFieldsRecursive([{
                  id: column.id,
                  column_name: column.name,
                  type: fieldType,
                  options: columnOptions,
                  properties: column.properties,
                  validation: column.validation,
                  parent_datatype: column.parent_datatype,
                  parentDatatype: column.parentDatatype
                }], recordFormData, [], 0)
              }

              // Simple fields
              return (
                <div key={column.id} className="space-y-2">
                  <Label>{column.name}</Label>
                  {fieldType === 'textarea' ? (
                    <Textarea
                      value={fieldValue || ''}
                      onChange={e => handleRecursiveFieldChange(column.id, e.target.value, [])}
                    />
                  ) : fieldType === 'phone' ? (
                    <PhoneInput
                      value={typeof fieldValue === 'object' && fieldValue !== null
                        ? { countryCode: fieldValue.countryCode || column.validation?.defaultCountry || '+91', number: fieldValue.number || '' }
                        : { countryCode: column.validation?.defaultCountry || '+91', number: fieldValue || '' }}
                      onChange={val => handleRecursiveFieldChange(column.id, val, [])}
                      countries={countries}
                    />
                  ) : fieldType === 'number' ? (
                    (() => {
                      // Check if value is outside min/max range
                      const numValue = parseFloat(fieldValue)
                      const isOutOfRange = fieldValue && !isNaN(numValue) && (
                        (column.validation?.min !== undefined && numValue < column.validation.min) ||
                        (column.validation?.max !== undefined && numValue > column.validation.max)
                      )
                      return (
                        <div className="space-y-1">
                          <div className="relative">
                            <Input
                              type="number"
                              value={fieldValue || ''}
                              onChange={e => handleRecursiveFieldChange(column.id, e.target.value, [])}
                              min={column.validation?.min}
                              max={column.validation?.max}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`pr-8 ${isOutOfRange ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                            {fieldValue && (
                              <button
                                type="button"
                                onClick={() => handleRecursiveFieldChange(column.id, '', [])}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Clear input"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {isOutOfRange && (
                            <p className="text-xs text-red-500">
                              {column.validation?.min !== undefined && column.validation?.max !== undefined
                                ? `Value must be between ${column.validation.min} and ${column.validation.max}`
                                : column.validation?.min !== undefined
                                  ? `Value must be at least ${column.validation.min}`
                                  : `Value must be at most ${column.validation.max}`
                              }
                            </p>
                          )}
                        </div>
                      )
                    })()
                  ) : (
                    <Input
                      type={
                        fieldType === 'email' ? 'email' :
                          fieldType === 'date' ? 'date' :
                            fieldType === 'datetime' ? 'datetime-local' : 'text'
                      }
                      value={fieldValue || ''}
                      onChange={e => handleRecursiveFieldChange(column.id, e.target.value, [])}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddRecordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRecordSubmit} disabled={isSubmittingRecord}>
              {isSubmittingRecord && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TableSettingsDialog
        table={table}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onUpdate={onUpdateTableDetails}
      />
    </div>
  )
}

function PhoneInput({ value, onChange, countries }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedCountry = countries?.find(c => c.dial === value?.countryCode)

  const filteredCountries = (countries || []).filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  )

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[110px] justify-between h-10 px-3 shrink-0"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {selectedCountry ? (
                <>
                  {selectedCountry.flag ? (
                    <img src={selectedCountry.flag} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
                  ) : (
                    <span className="text-lg shrink-0">{selectedCountry.emoji || "🏳️"}</span>
                  )}
                  <span className="font-medium truncate">{value?.countryCode || selectedCountry.dial}</span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{countries?.length === 0 ? "Loading..." : "Select"}</span>
                </div>
              )}
            </div>
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search country..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filteredCountries.length === 0 ? (
                <CommandEmpty>No country found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  <ScrollArea className="h-[250px]">
                    {filteredCountries.map((country) => (
                      <CommandItem
                        key={`${country.code}-${country.dial}`}
                        onSelect={() => {
                          onChange({ ...value, countryCode: country.dial })
                          setOpen(false)
                          setSearch("")
                        }}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {country.flag ? (
                            <img src={country.flag} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
                          ) : (
                            <span className="text-xl">{country.emoji}</span>
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium">{country.label}</span>
                            <span className="text-xs text-muted-foreground">{country.dial}</span>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value?.countryCode === country.dial ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        className="flex-1 h-10"
        placeholder="Phone number"
        value={value?.number || ''}
        onChange={e => onChange({ ...value, number: e.target.value })}
      />
    </div>
  )
}

// Sortable Column Component
function SortableColumn({ column, table, onUpdate, onDelete, onEditName }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className="relative group bg-muted/50 border-r border-border last:border-r-0"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 cursor-grab active:cursor-grabbing shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </Button>
          <EditableColumnName
            column={column}
            onSave={onEditName}
          />
          <Badge variant="secondary" className="text-xs shrink-0">
            {columnTypes.find(t => t.value === column.type)?.label}
          </Badge>
        </div>

        <ColumnSettings
          table={table}
          column={column}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </div>
    </TableHead>
  )
}

// Table Content Component
function TableContent({ table, onUpdateColumns, onUpdateTables, tables, setTables, onFetchRecords, onAddRecord, records, countries }) {
  const [activeColumn, setActiveColumn] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event) => {
    setActiveColumn(table.columns.find(col => col.id === event.active.id))
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveColumn(null)

    if (active.id !== over?.id) {
      const oldIndex = table.columns.findIndex(col => col.id === active.id)
      const newIndex = table.columns.findIndex(col => col.id === over.id)

      const newColumns = arrayMove(table.columns, oldIndex, newIndex)
      onUpdateColumns(table.id, newColumns)
    }
  }

  const deleteRow = async (rowId) => {
    try {
      const response = await recordsApi.delete(table.id, rowId)
      if (response.data) {
        toast.success("Row deleted")
        onUpdateTables(prev => {
          const refreshed = prev.map(t => {
            if (t.id === table.id) {
              return { ...t, rows: t.rows.filter(r => r.id !== rowId) }
            }
            return t
          })
          return refreshed
        })

      }
    } catch (e) {
      console.error("Delete error", e)
      toast.error("Failed to delete row")
    }
  }


  // Helper to find label for a value in options
  const findOptionLabel = (options, value) => {
    if (!options || !Array.isArray(options)) return value
    const opt = options.find(o => {
      const oval = typeof o === 'object' ? (o.value || o.label) : o
      return oval === value
    })
    if (!opt) return value
    return typeof opt === 'object' ? (opt.label || opt.value) : opt
  }

  const renderCell = (row, column) => {
    const value = row.cells[column.id]

    // Common renderer logic
    const renderPrimitive = (val) => {
      if ((column.type === 'date' || column.type === 'datetime') && val) {
        try {
          return format(new Date(val), column.type === 'datetime' ? "PPp" : "PPP")
        } catch (e) {
          return val
        }
      }
      if (column.type === 'status') return <Badge variant={val === "active" ? "default" : "secondary"}>{val || "inactive"}</Badge>
      return val
    }

    // Handle complex object { value, nestedValues }
    if (value && typeof value === 'object' && !Array.isArray(value) && value.hasOwnProperty('value')) {
      const primaryVal = value.value
      const nested = value.nestedValues || {}
      const hasNested = Object.keys(nested).length > 0

      let primaryDisplay = renderPrimitive(primaryVal)
      if ((column.type === 'select' || column.type === 'radio') && column.options) {
        primaryDisplay = findOptionLabel(column.options, primaryVal)
      }
      if (column.type === 'phone' && typeof primaryVal === 'object') {
        const country = countries?.find(c => c.dial === primaryVal.countryCode)
        const flagSpan = country?.flag ? (
          <img src={country.flag} alt="" className="w-4 h-3 object-cover rounded-sm inline mr-1" />
        ) : (
          <span>{country?.emoji || ''}</span>
        )
        primaryDisplay = primaryVal.number ? (
          <span className="flex items-center gap-1">
            {flagSpan} {primaryVal.countryCode || ''} {primaryVal.number}
          </span>
        ) : JSON.stringify(primaryVal)
      }

      if (column.type === 'location' && typeof primaryVal === 'object' && primaryVal !== null) {
        const { country, state, city } = primaryVal
        const parts = [country, state, city].filter(Boolean)
        primaryDisplay = parts.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {parts.map((p, i) => (
              <Fragment key={i}>
                <span className="text-sm">{p}</span>
                {i < parts.length - 1 && <span className="text-muted-foreground">/</span>}
              </Fragment>
            ))}
          </div>
        ) : "-"
      }

      return (
        <div className="flex flex-col gap-1">
          <span>{primaryDisplay || "-"}</span>
          {hasNested && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-1 rounded space-y-0.5">
              {Object.entries(nested).map(([k, v]) => {
                let nVal = v
                if (typeof v === 'object' && v !== null) {
                  if (v.hasOwnProperty('value')) {
                    nVal = v.value
                  } else if (Array.isArray(v)) {
                    // Array of objects with value prop?
                    nVal = v.map(item => {
                      if (typeof item === 'object' && item.value) return item.value
                      return item
                    }).join(", ")
                  } else {
                    // Fallback
                    nVal = JSON.stringify(v)
                  }
                }
                return <div key={k}>{String(nVal)}</div>
              })}
            </div>
          )}
        </div>
      )
    }

    // Handle Arrays (Multi-select / Checkbox)
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1">
            {value.map((v, i) => {
              let val = v
              let nest = {}
              if (typeof v === 'object') {
                val = v.value
                nest = v.nestedValues || {}
              }
              return (
                <Badge key={i} variant="outline" className="text-xss">
                  {val}
                  {Object.keys(nest).length > 0 && "*"}
                </Badge>
              )
            })}
          </div>
        </div>
      )
    }

    // Fallback primitive
    if (typeof value === 'object' && value !== null) {
      // Phone literal object
      if (column.type === 'phone') {
        const country = countries?.find(c => c.dial === value.countryCode)
        const flagSpan = country?.flag ? (
          <img src={country.flag} alt="" className="w-4 h-3 object-cover rounded-sm inline mr-1" />
        ) : (
          <span>{country?.emoji || ''}</span>
        )
        return value.number ? (
          <span className="flex items-center gap-1">
            {flagSpan} {value.countryCode || ''} {value.number}
          </span>
        ) : JSON.stringify(value)
      }
      if (column.type === 'location' && value) {
        const { country, state, city } = value
        const parts = [country, state, city].filter(Boolean)
        return parts.length > 0 ? parts.join(" / ") : "-"
      }
      return JSON.stringify(value)
    }

    return renderPrimitive(value) || "-"
  }

  return (

    <CardContent className="pt-0">
      <div className="border rounded-lg overflow-hidden relative shadow-sm">
        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-muted-foreground/20">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <Table className="w-full min-w-max border-collapse">
              <TableHeader>
                <TableRow>
                  <SortableContext items={table.columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                    {table.columns.map(column => (
                      <SortableColumn
                        key={column.id}
                        column={column}
                        table={table}
                        onUpdate={(updates) => onUpdateColumns(table.id, column.id, updates)}
                        onDelete={() => onUpdateColumns(table.id, column.id, null, true)}
                        onEditName={(newName) => onUpdateColumns(table.id, column.id, { name: newName })}
                      />
                    ))}
                  </SortableContext>
                  {/* Action Column Removed */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(records || table.rows || []).map(row => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    {table.columns.map(column => (
                      <TableCell
                        key={`${row.id}-${column.id}`}
                        className="border-r border-border last:border-r-0"
                      >
                        <div className={`
                            ${column.type === 'number' ? 'text-right' : ''}
                            ${column.type === 'checkbox' ? 'flex justify-center' : ''}
                          `}>
                          {renderCell(row, column)}
                        </div>
                      </TableCell>
                    ))}
                    {/* Action Cell Removed */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DragOverlay>
              {activeColumn ? (
                <TableHead className="bg-primary/20 border-2 border-primary border-dashed">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{activeColumn.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {columnTypes.find(t => t.value === activeColumn.type)?.label}
                    </Badge>
                  </div>
                </TableHead>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

    </CardContent >
  )
}

function EditableColumnName({ column, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(column.name)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    if (value.trim() && value !== column.name) {
      onSave(value.trim())
    } else {
      setValue(column.name)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setValue(column.name)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-7 text-sm w-32"
      />
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-1 hover:bg-muted px-2 py-1 rounded text-left group min-w-0 flex-1"
    >
      <span className="font-medium truncate">{column.name}</span>
      <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

function ColumnSettings({ table, column, onUpdate, onDelete }) {
  const [isOpen, setIsOpen] = useState(false)
  const [localColumn, setLocalColumn] = useState(column)
  const [isSaving, setIsSaving] = useState(false)

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalColumn(column)
    }
  }, [isOpen, column])

  const handleLocalUpdate = (updates) => {
    setLocalColumn(prev => ({ ...prev, ...updates }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const backendData = mapFrontendColumnToBackend(localColumn)
      const response = await datatablesApi.updateColumn(table.id, column.id, backendData)

      if (response.data && (response.data.success || response.data.status === 'success')) {
        onUpdate(localColumn)
        setIsOpen(false)
        toast.success("Column updated successfully")
      }
    } catch (error) {
      console.error("Error updating column:", error)
      toast.error("Failed to update column")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] lg:max-w-[1000px] h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-xl font-semibold">Column Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background/50">
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-thin">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Column Type</Label>
                <Select
                  value={localColumn.type}
                  onValueChange={(type) => handleLocalUpdate({ type })}
                >
                  <SelectTrigger className="w-full h-11 bg-background border-2 transition-all hover:border-primary/50 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columnTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-3 py-1">
                          <t.icon className="h-4 w-4 text-primary" />
                          <span className="font-medium">{t.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-dashed">
                <ColumnConfigPanel
                  column={localColumn}
                  onUpdate={handleLocalUpdate}
                  columnTypes={columnTypes}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-background flex justify-between items-center shadow-lg">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="h-11 px-6 font-medium"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <div className="flex gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="h-11 px-6 font-medium shadow-sm hover:shadow-md transition-shadow"
                  disabled={isSaving}
                >
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Column?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the column
                    <span className="font-semibold text-foreground mx-1">"{localColumn.name}"</span>?
                    This action cannot be undone and will permanently remove this column and all its data from the table.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete()
                      setIsOpen(false)
                    }}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete Column
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={handleSave}
              className="h-11 px-8 font-semibold shadow-md hover:shadow-lg transition-all"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditableCell({ value, column, onSave, onCancel }) {
  const getInitialValue = () => {
    if (value && typeof value === 'object' && !Array.isArray(value) && value.hasOwnProperty('value')) {
      return value.value
    }
    if (column.type === 'phone' && value && typeof value === 'object') {
      return value.number || ''
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return JSON.stringify(value)
    }
    return value
  }

  const [inputValue, setInputValue] = useState(getInitialValue())
  const inputRef = useRef(null)
  const [date, setDate] = useState(value ? new Date(value) : undefined)

  useEffect(() => {
    if (inputRef.current && column.type !== "date") {
      inputRef.current.focus()
    }
  }, [])

  const handleSave = () => {
    let finalValue = inputValue
    if (column.type === 'date' && date) {
      finalValue = date.toISOString()
    }

    // Preserve nested structure if original value was complex
    if (value && typeof value === 'object' && !Array.isArray(value) && value.hasOwnProperty('value')) {
      onSave({ ...value, value: finalValue })
    } else if (column.type === 'phone' && value && typeof value === 'object') {
      onSave({ ...value, number: finalValue })
    } else {
      onSave(finalValue)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  const handleBlur = () => {
    handleSave()
  }

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate)
    const isoDate = selectedDate.toISOString()
    if (value && typeof value === 'object' && value.hasOwnProperty('value')) {
      onSave({ ...value, value: isoDate })
    } else {
      onSave(isoDate)
    }
  }

  switch (column.type) {
    case "number":
      return (
        <Input
          ref={inputRef}
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-8"
        />
      )
    case "date":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-8 justify-start text-left font-normal"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )
    case "email":
      return (
        <Input
          ref={inputRef}
          type="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-8"
        />
      )
    case "phone":
      return (
        <Input
          ref={inputRef}
          type="tel"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-8"
        />
      )
    case "location":
      return (
        <div className="min-w-[300px]">
          <LocationPicker
            value={value && typeof value === 'object' && value.hasOwnProperty('value') ? value.value : value}
            onChange={(val) => {
              if (value && typeof value === 'object' && value.hasOwnProperty('value')) {
                onSave({ ...value, value: val })
              } else {
                onSave(val)
              }
            }}
            validation={column.validation || {}}
          />
        </div>
      )
    case "dropdown":
    case "select":
      return (
        <div className="flex gap-1 items-center w-full">
          <Select
            value={inputValue}
            onValueChange={(val) => {
              setInputValue(val)
              // If no nested fields, save immediately. If nested exist, user will probably need to click the gear.
              const optIdx = column.options?.indexOf(val)
              if (!column.nestedFields || !column.nestedFields[optIdx] || column.nestedFields[optIdx].length === 0) {
                onSave(val)
              }
            }}
            onOpenChange={(open) => !open && handleSave()}
          >
            <SelectTrigger ref={inputRef} className="h-8 flex-1 truncate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {column.nestedFields && column.nestedFields[column.options?.indexOf(inputValue)]?.length > 0 && (
            <NestedValuesDialog
              column={column}
              selectedOption={inputValue}
              currentValue={value}
              onSave={onSave}
            />
          )}
        </div>
      )
    case "checkbox":
      return (
        <div className="flex items-center gap-2 h-8 px-2">
          <Checkbox
            checked={!!inputValue}
            onCheckedChange={(checked) => {
              setInputValue(checked)
              onSave(checked)
            }}
          />
          <Label className="text-xs font-normal cursor-pointer" onClick={() => {
            const newVal = !inputValue
            setInputValue(newVal)
            onSave(newVal)
          }}>
            {column.name}
          </Label>
        </div>
      )
    case "radio":
      return (
        <div className="space-y-2 p-2 border rounded-md bg-muted/20">
          <RadioGroup
            value={inputValue}
            onValueChange={(val) => {
              setInputValue(val)
              onSave(val)
            }}
          >
            {column.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`radio-${column.id}-${index}`} />
                <Label htmlFor={`radio-${column.id}-${index}`} className="text-xs">{option}</Label>
              </div>
            ))}
          </RadioGroup>
          {column.nestedFields && column.nestedFields[column.options?.indexOf(inputValue)]?.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <NestedValuesDialog
                column={column}
                selectedOption={inputValue}
                currentValue={value}
                onSave={onSave}
              />
            </div>
          )}
        </div>
      )
  }
}

// Reusable Location Picker Component for Custom Table Builder
function LocationPicker({ value, onChange, validation = {} }) {
  const [countries, setCountries] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [open, setOpen] = useState({ country: false, state: false, city: false })
  const [search, setSearch] = useState({ country: "", state: "", city: "" })

  const current = value || { country: undefined, state: undefined, city: undefined }

  useEffect(() => {
    const loadCountries = async () => {
      const data = await fetchCountries()
      setCountries(data)
    }
    loadCountries()
  }, [])

  useEffect(() => {
    const loadStates = async () => {
      if (current.country) {
        setLoadingStates(true)
        try {
          const data = await fetchStates(current.country)
          setStates(data)
        } finally {
          setLoadingStates(false)
        }
      } else {
        setStates([])
      }
    }
    loadStates()
  }, [current.country])

  useEffect(() => {
    const loadCities = async () => {
      if (current.state && current.country) {
        setLoadingCities(true)
        try {
          const data = await fetchCities(current.country, current.state)
          setCities(data)
        } finally {
          setLoadingCities(false)
        }
      } else {
        setCities([])
      }
    }
    loadCities()
  }, [current.state, current.country])

  const filteredCountries = countries.filter(c => {
    if (validation.allowedCountries?.length > 0 && !validation.allowedCountries.includes(c.name)) return false
    return c.name.toLowerCase().includes(search.country.toLowerCase())
  })

  const filteredStates = states.filter(s => {
    if (validation.allowedStates?.[current.country]?.length > 0 && !validation.allowedStates[current.country].includes(s.name)) return false
    return s.name.toLowerCase().includes(search.state.toLowerCase())
  })

  const filteredCities = cities.filter(c => {
    if (validation.allowedCities?.[current.state]?.length > 0 && !validation.allowedCities[current.state].includes(c.name)) return false
    return c.name.toLowerCase().includes(search.city.toLowerCase())
  })

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Country Select */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Country</Label>
        <SelectPopover
          title="Country"
          open={open.country}
          setOpen={(o) => setOpen(prev => ({ ...prev, country: o }))}
          value={current.country}
          onSelect={(val) => {
            onChange({ country: val, state: undefined, city: undefined })
            setOpen(prev => ({ ...prev, country: false, state: true }))
          }}
          options={filteredCountries}
          search={search.country}
          setSearch={(s) => setSearch(prev => ({ ...prev, country: s }))}
        />
      </div>

      {/* State Select */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">State</Label>
        <SelectPopover
          title="State"
          disabled={!current.country}
          loading={loadingStates}
          open={open.state}
          setOpen={(o) => setOpen(prev => ({ ...prev, state: o }))}
          value={current.state}
          onSelect={(val) => {
            onChange({ ...current, state: val, city: undefined })
            setOpen(prev => ({ ...prev, state: false, city: true }))
          }}
          options={filteredStates}
          search={search.state}
          setSearch={(s) => setSearch(prev => ({ ...prev, state: s }))}
        />
      </div>

      {/* City Select */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">City</Label>
        <SelectPopover
          title="City"
          disabled={!current.state}
          loading={loadingCities}
          open={open.city}
          setOpen={(o) => setOpen(prev => ({ ...prev, city: o }))}
          value={current.city}
          onSelect={(val) => {
            onChange({ ...current, city: val })
            setOpen(prev => ({ ...prev, city: false }))
          }}
          options={filteredCities}
          search={search.city}
          setSearch={(s) => setSearch(prev => ({ ...prev, city: s }))}
        />
      </div>
    </div>
  )
}

function SelectPopover({ title, open, setOpen, value, onSelect, options, search, setSearch, disabled, loading }) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between h-9 text-xs font-normal bg-background"
        >
          <span className="truncate">{value || `Select ${title}...`}</span>
          {loading ? <Loader2 className="h-3 w-3 animate-spin opacity-50" /> : <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
            className="h-8"
          />
          <CommandList className="max-h-[200px]">
            {options.length === 0 ? (
              <CommandEmpty>No {title.toLowerCase()} found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.name}
                    onSelect={() => onSelect(opt.name)}
                    className="flex items-center justify-between cursor-pointer py-1.5 text-xs"
                  >
                    <span className="truncate">{opt.name}</span>
                    <Check
                      className={cn(
                        "h-3.5 w-3.5",
                        value === opt.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function getDefaultValueForType(type) {
  switch (type) {
    case "number":
      return 0
    case "checkbox":
      return false
    case "date":
      return new Date().toISOString()
    case "dropdown":
      return ""
    case "status":
      return "active"
    default:
      return ""
  }
}

function NestedValuesDialog({ column, selectedOption, currentValue, onSave }) {
  const optionIndex = column.options?.indexOf(selectedOption)
  const nestedCols = column.nestedFields?.[optionIndex] || []
  const [nestedValues, setNestedValues] = useState({})
  const [isOpen, setIsOpen] = useState(false)

  // Sync state when props change or dialog opens
  useEffect(() => {
    if (isOpen) {
      // Only reset/sync if it matches the current selected option
      if (currentValue?.value === selectedOption) {
        setNestedValues(currentValue?.nestedValues || {})
      } else {
        setNestedValues({})
      }
    }
  }, [isOpen, selectedOption, currentValue])

  if (nestedCols.length === 0) return null

  const handleSave = () => {
    onSave({
      value: selectedOption,
      nestedValues: nestedValues
    })
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Details for {selectedOption}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {nestedCols.map((nestedCol) => (
            <div key={nestedCol.id} className="space-y-2">
              <Label>{nestedCol.name}</Label>
              <EditableCell
                value={nestedValues[nestedCol.id]}
                column={nestedCol}
                onSave={(val) => setNestedValues(prev => ({ ...prev, [nestedCol.id]: val }))}
                onCancel={() => { }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Apply Details</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper to recursively convert array-based nested structure (Backend/FormBuilder)
// to map-based nested structure (CustomTableBuilder UI)
const processBackendNestedFields = (fieldsArray) => {
  if (!Array.isArray(fieldsArray)) return []

  return fieldsArray.map(field => {
    const processedField = {
      ...field,
      id: field.id || uuidv4(),
      // Prioritize human-readable label for UI name
      name: field.label || field.name || field.column_name,
      technicalName: field.name, // Preserve technical slug
      type: field.type || field.data_type || 'text',
      options: [],
      nestedFields: {}
    }

    // Process options
    if (field.options && Array.isArray(field.options)) {
      processedField.options = field.options.map((opt, idx) => {
        const optionValue = typeof opt === 'object' ? (opt.value || opt.label) : opt

        // If option is an object with nestedFields, move them to the parent's map
        if (typeof opt === 'object' && opt.nestedFields && Array.isArray(opt.nestedFields)) {
          processedField.nestedFields[idx] = processBackendNestedFields(opt.nestedFields)
        }

        return optionValue
      })
    }

    return processedField
  })
}

// Helper to recursively convert map-based nested structure (UI)
// to array-based nested structure (Backend/FormBuilder)
const processFrontendNestedFields = (fieldsArray, nestedFieldsMap) => {
  if (!Array.isArray(fieldsArray)) return []

  return fieldsArray.map((field, fieldIdx) => {
    const processedField = {
      ...field,
      label: field.name, // The UI name is the human-friendly label
      name: field.technicalName || field.name?.toLowerCase().replace(/\s+/g, '_'), // Restore technical slug or generate one
      options: (field.options || []).map((opt, optIdx) => {
        const nestedForOption = nestedFieldsMap?.[optIdx] || field.nestedFields?.[optIdx] || []

        if (nestedForOption.length > 0) {
          return {
            value: typeof opt === 'object' ? opt.value : opt,
            label: typeof opt === 'object' ? opt.label : opt,
            nestedFields: processFrontendNestedFields(nestedForOption, {})
          }
        }
        return opt
      })
    }
    // Remove the flat nestedFields map from the final object to keep it clean
    delete processedField.nestedFields
    return processedField
  })
}

const mapBackendTableToFrontend = (backendTable) => ({
  id: backendTable.table_id || backendTable.id,
  name: backendTable.table_name || backendTable.name,
  description: backendTable.description || "",
  isActive: backendTable.is_active ?? true,
  columns: (backendTable.columns || []).map(col => {
    // Prioritize parent_datatype for the UI type
    const uiType = col.parent_datatype || col.data_type || col.type || 'text'

    // Parse optional_values (can be array of strings or array of objects)
    let parsedOptions = []
    if (col.optional_values) {
      if (Array.isArray(col.optional_values)) {
        // Handle array of strings or objects
        parsedOptions = col.optional_values.map(opt => {
          if (typeof opt === 'string') {
            // Try to parse if it's a JSON string
            try {
              const parsed = JSON.parse(opt)
              // If it's an array (like "[...]") return the array
              if (Array.isArray(parsed)) return parsed
              return parsed
            } catch {
              return opt
            }
          }
          return opt
        }).flat() // Flatten in case we had nested arrays from string parsing
      } else if (typeof col.optional_values === 'string') {
        try {
          parsedOptions = JSON.parse(col.optional_values)
        } catch {
          parsedOptions = []
        }
      }
    }

    // Process the hierarchical structure using recursion
    const initialNestedFields = {}
    const processedOptions = (parsedOptions || []).map((opt, idx) => {
      if (typeof opt === 'object' && opt.nestedFields && Array.isArray(opt.nestedFields)) {
        initialNestedFields[idx] = processBackendNestedFields(opt.nestedFields)
      }
      return typeof opt === 'object' ? (opt.label || opt.value) : opt
    })

    const properties = col.properties || {}
    const propertyNestedFieldsMap = typeof properties.nestedFields === 'string'
      ? JSON.parse(properties.nestedFields)
      : (properties.nestedFields || {})

    // Deep merge or combine maps
    const combinedNestedFieldsMap = { ...initialNestedFields, ...propertyNestedFieldsMap }

    const validation = typeof properties.validation === 'string'
      ? JSON.parse(properties.validation)
      : (properties.validation || {})

    return {
      id: col.column_id || col.id,
      name: col.column_name || col.name,
      type: uiType,
      editable: true,
      isSearchable: col.is_searchable ?? true,
      options: processedOptions,
      rawOptions: parsedOptions,
      required: col.required ?? false,
      properties: properties,
      nestedFields: combinedNestedFieldsMap,
      validation: validation,
      parentDatatype: col.parent_datatype
    }
  }),
  createdAt: backendTable.created_at || backendTable.createdAt || new Date().toISOString(),
  rows: []
})

const mapBackendRecordsToFrontend = (records, columns) => {
  return records.map(record => {
    const cells = {}
    columns.forEach(col => {
      // Backend might return field_values as a JSON string or object
      // key is column_id
      const rawVal = record.field_values?.[col.id]

      let parsedVal = rawVal
      if (typeof rawVal === 'string') {
        try {
          // Attempt to parse if it looks like JSON or if we expect structured data
          // Simple heuristic: starts with { or [
          if (rawVal.trim().startsWith('{') || rawVal.trim().startsWith('[')) {
            parsedVal = JSON.parse(rawVal)
          }
        } catch (e) {
          // Keep as string if parsing fails
        }
      }

      // If it's the specific structure { value: "...", nestedValues: ... }
      if (parsedVal && typeof parsedVal === 'object' && !Array.isArray(parsedVal) && parsedVal.hasOwnProperty('value')) {
        cells[col.id] = parsedVal // Keep full object
      } else if (Array.isArray(parsedVal)) {
        cells[col.id] = parsedVal // Keep array
      } else {
        cells[col.id] = parsedVal
      }
    })
    return {
      id: record.record_id || record.id,
      cells
    }
  })
}

const mapFrontendColumnToBackend = (column) => {
  // Recursively process options to embed nested fields (Form Builder Style)
  const consolidatedOptions = (column.options || []).map((opt, idx) => {
    const nestedForThisOption = column.nestedFields?.[idx] || []
    if (nestedForThisOption.length > 0) {
      return {
        value: typeof opt === 'object' ? opt.value : opt,
        label: typeof opt === 'object' ? opt.label : opt,
        nestedFields: processFrontendNestedFields(nestedForThisOption, {})
      }
    }
    return opt
  })

  return {
    column_name: column.name,
    data_type: column.type,
    is_searchable: column.isSearchable ?? true,
    properties: {
      ...(column.properties || {}),
      nestedFields: JSON.stringify(column.nestedFields || {}),
      validation: JSON.stringify(column.validation || {}),
    },
    optional_values: consolidatedOptions,
    required: column.required ?? false
  }
}

export default function CustomTableBuilder() {
  const [tables, setTables] = useState([])
  const [currentTable, setCurrentTable] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'edit'
  const [tableListViewMode, setTableListViewMode] = useState('card') // 'card' | 'list'
  const [isCreatingTable, setIsCreatingTable] = useState(false)
  const [newTableName, setNewTableName] = useState("")
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [addedColumns, setAddedColumns] = useState([])
  const [activeColumnIndex, setActiveColumnIndex] = useState(0)

  const createDefaultColumn = () => ({
    id: uuidv4(),
    name: "New Column",
    type: "text",
    options: [],
    required: false,
    isSearchable: true,
    properties: {},
    validation: {},
    nestedFields: {}
  })

  const [loading, setLoading] = useState(false)

  // Pagination State
  const [tablesPage, setTablesPage] = useState(1)
  const [tablesRowsPerPage, setTablesRowsPerPage] = useState(10)
  const [totalTables, setTotalTables] = useState(0)
  const [tablesSearch, setTablesSearch] = useState("")

  const [activeTab, setActiveTab] = useState("all")
  const [groupBy, setGroupBy] = useState("status")

  const [records, setRecords] = useState([])
  const [countries, setCountries] = useState([])

  useEffect(() => {
    const loadCountries = async () => {
      const data = await fetchPhoneCountries()
      setCountries(data)
    }
    loadCountries()
  }, [])

  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsRowsPerPage, setRecordsRowsPerPage] = useState(10)
  const [totalRecords, setTotalRecords] = useState(0)
  const [recordsSearch, setRecordsSearch] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchTables()
  }, [tablesPage, tablesRowsPerPage, tablesSearch])


  const fetchTables = async () => {
    setLoading(true)
    try {
      const response = await datatablesApi.getAll({})
      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const responseData = response.data.data
        const meta = response.data.meta || {}

        let rawTables = []
        if (Array.isArray(responseData)) {
          rawTables = responseData
        } else if (responseData && Array.isArray(responseData.data)) {
          rawTables = responseData.data
        }

        // Client-side filtering fallback
        if (tablesSearch && rawTables.length > 0) {
          const lowerSearch = tablesSearch.toLowerCase()
          if (rawTables.length > tablesRowsPerPage) {
            rawTables = rawTables.filter(t =>
              (t.table_name || t.name || "").toLowerCase().includes(lowerSearch) ||
              (t.description || "").toLowerCase().includes(lowerSearch)
            )
          }
        }

        // Set total count
        const total = meta.total || (responseData.pagination ? responseData.pagination.total : rawTables.length)
        setTotalTables(total)

        const mappedTables = rawTables.map(mapBackendTableToFrontend)
        setTables(mappedTables)

        // Proactively fetch columns for each table to show accurate counts in the list
        rawTables.forEach(async (table) => {
          const tableId = table.table_id || table.id
          try {
            const colRes = await datatablesApi.getColumns(tableId)
            if (colRes.data && (colRes.data.success === true || colRes.data.status === 'success')) {
              const columns = colRes.data.data
              setTables(prev => prev.map(t => {
                if (t.id === tableId) {
                  // Reuse mapping logic for columns
                  const mappedColumns = columns.map(col => ({
                    id: col.column_id || col.id,
                    name: col.column_name || col.name,
                    type: col.data_type || col.type,
                    options: col.optional_values || col.options || [],
                    isSearchable: col.is_searchable ?? true,
                    required: col.required ?? false,
                    properties: col.properties || {}
                  }))
                  return { ...t, columns: mappedColumns }
                }
                return t
              }))
            }
          } catch (e) {
            console.error(`Error fetching columns for table ${tableId}:`, e)
          }
        })
      }
    } catch (error) {
      console.error("Error fetching tables:", error)
      toast.error("Failed to load tables")
    } finally {
      setLoading(false)
    }
  }

  const handleWizardComplete = async ({ name, description, columns }) => {
    try {
      setLoading(true)

      // 1. Create Table
      const createRes = await datatablesApi.create({
        table_name: name.trim(),
        description: description,
        is_active: true
      })

      if (createRes.data && (createRes.data.success === true || createRes.data.status === 'success')) {
        const newTable = mapBackendTableToFrontend(createRes.data.data)
        const tableId = newTable.id

        // 2. Add Columns
        if (columns.length > 0) {
          const columnsData = columns.map(mapFrontendColumnToBackend)
          await datatablesApi.addColumn(tableId, columnsData)
        }

        // 3. Fetch final state
        const [tableRes, columnsRes] = await Promise.all([
          datatablesApi.getById(tableId),
          datatablesApi.getColumns(tableId)
        ])

        if (tableRes.data && (tableRes.data.success === true || tableRes.data.status === 'success')) {
          let backendTable = tableRes.data.data
          if (columnsRes.data && (columnsRes.data.success === true || columnsRes.data.status === 'success')) {
            backendTable = { ...backendTable, columns: columnsRes.data.data }
          }
          const finalTable = mapBackendTableToFrontend(backendTable)

          setTables([finalTable, ...tables])
          setCurrentTable(finalTable)
          setView('edit')
          setIsCreatingTable(false)
          toast.success("Table created successfully!")
        }
      }
    } catch (error) {
      console.error("Error creating table via wizard:", error)
      toast.error("Failed to create table")
    } finally {
      setLoading(false)
    }
  }

  const openAddColumnModal = (table = currentTable) => {
    if (!table) return
    setCurrentTable(table)
    setAddedColumns([createDefaultColumn()])
    setActiveColumnIndex(0)
    setIsAddingColumn(true)
  }

  const addColumn = async () => {
    const invalidColumn = addedColumns.find(col => !col.name.trim())
    if (invalidColumn) {
      toast.error("Please enter a name for all columns")
      return
    }

    const targetTable = currentTable
    if (!targetTable) return

    try {
      setLoading(true)
      const columnsData = addedColumns.map(mapFrontendColumnToBackend)

      const response = await datatablesApi.addColumn(targetTable.id, columnsData)

      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const [tableRes, columnsRes] = await Promise.all([
          datatablesApi.getById(targetTable.id),
          datatablesApi.getColumns(targetTable.id)
        ])

        if (tableRes.data && (tableRes.data.success === true || tableRes.data.status === 'success')) {
          let backendTable = tableRes.data.data

          if (columnsRes.data && (columnsRes.data.success === true || columnsRes.data.status === 'success')) {
            backendTable = { ...backendTable, columns: columnsRes.data.data }
          }

          const fetchedTable = mapBackendTableToFrontend(backendTable)
          // Preserve existing rows to prevent them from disappearing immediately
          // The new column will just be missing from the cells until we fetch or edit, which renderCell handles
          const updatedTable = {
            ...fetchedTable,
            rows: targetTable.rows || []
          }

          const updatedTables = tables.map(table =>
            table.id === targetTable.id ? updatedTable : table
          )
          setTables(updatedTables)
          setCurrentTable(updatedTable)
          setIsAddingColumn(false)
          toast.success(`${addedColumns.length} column(s) added successfully!`)

          // Refresh records to ensure we have the latest structure/defaults if any
          fetchRecords(targetTable.id)
        }
      }
    } catch (error) {
      console.error("Error adding columns:", error)
      toast.error("Failed to add columns")
    } finally {
      setLoading(false)
    }
  }

  const addRow = (tableId = currentTable?.id) => {
    const targetTable = tableId ? tables.find(t => t.id === tableId) : currentTable
    if (!targetTable) return

    const newRow = {
      id: `row-${Date.now()}`,
      cells: targetTable.columns.reduce((acc, column) => {
        acc[column.id] = getDefaultValueForType(column.type)
        return acc
      }, {})
    }

    const updatedTable = {
      ...targetTable,
      rows: [...targetTable.rows, newRow]
    }

    const updatedTables = tables.map(table =>
      table.id === targetTable.id ? updatedTable : table
    )

    setTables(updatedTables)
    if (currentTable?.id === targetTable.id) {
      setCurrentTable(updatedTable)
    }
  }

  const updateColumns = async (tableId, columnId, updates, isDelete = false) => {
    const targetTable = tables.find(t => t.id === tableId)
    if (!targetTable) return

    if (Array.isArray(columnId)) {
      // Reordering - local for now
      const updatedTable = { ...targetTable, columns: columnId }
      const updatedTables = tables.map(table =>
        table.id === tableId ? updatedTable : table
      )
      setTables(updatedTables)
      if (currentTable?.id === tableId) setCurrentTable(updatedTable)
    } else if (isDelete) {
      try {
        setLoading(true)
        const response = await datatablesApi.deleteColumn(tableId, columnId)
        if (response.data && (response.data.success === true || response.data.status === 'success')) {
          const updatedColumns = targetTable.columns.filter(col => col.id !== columnId)
          const updatedTable = { ...targetTable, columns: updatedColumns }
          const updatedTables = tables.map(table => table.id === tableId ? updatedTable : table)
          setTables(updatedTables)
          if (currentTable?.id === tableId) setCurrentTable(updatedTable)
          toast.success("Column deleted")
        }
      } catch (error) {
        console.error("Error deleting column:", error)
        toast.error("Failed to delete column")
      } finally {
        setLoading(false)
      }
    } else {
      try {
        setLoading(true)
        const column = targetTable.columns.find(c => c.id === columnId)
        const updatedData = mapFrontendColumnToBackend({ ...column, ...updates })
        const response = await datatablesApi.updateColumn(tableId, columnId, updatedData)
        if (response.data && (response.data.success === true || response.data.status === 'success')) {
          const updatedColumns = targetTable.columns.map(col =>
            col.id === columnId ? { ...col, ...updates } : col
          )
          const updatedTable = { ...targetTable, columns: updatedColumns }
          const updatedTables = tables.map(table => table.id === tableId ? updatedTable : table)
          setTables(updatedTables)
          if (currentTable?.id === tableId) setCurrentTable(updatedTable)
        }
      } catch (error) {
        console.error("Error updating column:", error)
        toast.error("Failed to update column")
      } finally {
        setLoading(false)
      }
    }
  }

  const deleteRow = (tableId, rowId) => {
    const targetTable = tables.find(t => t.id === tableId)
    if (!targetTable) return

    const updatedRows = targetTable.rows.filter(row => row.id !== rowId)
    const updatedTable = { ...targetTable, rows: updatedRows }

    const updatedTables = tables.map(table =>
      table.id === tableId ? updatedTable : table
    )

    setTables(updatedTables)
    if (currentTable?.id === tableId) {
      setCurrentTable(updatedTable)
    }
    toast.success("Row deleted")
  }

  const deleteTable = async (tableId) => {
    try {
      setLoading(true)
      const response = await datatablesApi.delete(tableId)
      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const updatedTables = tables.filter(table => table.id !== tableId)
        setTables(updatedTables)
        if (currentTable?.id === tableId) {
          setCurrentTable(updatedTables[0] || null)
          setView('list')
        }
        toast.success("Table deleted")
      }
    } catch (error) {
      console.error("Error deleting table:", error)
      toast.error("Failed to delete table")
    } finally {
      setLoading(false)
    }
  }

  const toggleTableStatus = async (tableId, currentStatus) => {
    try {
      setLoading(true)
      const response = await datatablesApi.updateStatus(tableId, { is_active: !currentStatus })
      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const updatedTables = tables.map(table =>
          table.id === tableId ? { ...table, isActive: !currentStatus } : table
        )
        setTables(updatedTables)
        if (currentTable?.id === tableId) {
          setCurrentTable({ ...currentTable, isActive: !currentStatus })
          // Refetch records if activating the table to clear cached 410 responses
          if (!currentStatus) {
            fetchRecords(tableId)
          }
        }
        toast.success(`Table ${!currentStatus ? 'activated' : 'deactivated'}`)
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
    } finally {
      setLoading(false)
    }
  }

  const updateTableDetails = async (tableId, updates) => {
    try {
      setLoading(true)
      const response = await datatablesApi.update(tableId, updates)
      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const updatedBackendTable = response.data.data
        // maintain current columns and rows, just update metadata
        const currentData = tables.find(t => t.id === tableId)
        const updatedTable = {
          ...currentData,
          name: updatedBackendTable.table_name || updatedBackendTable.name,
          description: updatedBackendTable.description,
          isActive: updatedBackendTable.is_active ?? true
        }

        const updatedTables = tables.map(table =>
          table.id === tableId ? updatedTable : table
        )
        setTables(updatedTables)
        if (currentTable?.id === tableId) {
          setCurrentTable(updatedTable)
        }
        return true
      }
    } catch (error) {
      console.error("Error updating table details:", error)
      throw error // Re-throw to be caught by the dialog
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentTable?.id) {
      fetchRecords(currentTable.id)
    }
  }, [currentTable?.id, recordsPage, recordsRowsPerPage, recordsSearch])

  const fetchRecords = async (tableId) => {
    if (!tableId) return
    try {
      const response = await recordsApi.getAll(tableId, {})

      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const responseData = response.data.data
        const meta = response.data.meta || {}

        let records = []
        if (Array.isArray(responseData)) {
          records = responseData
        } else if (responseData && Array.isArray(responseData.data)) {
          records = responseData.data
        }

        // Client-side filtering fallback
        if (recordsSearch && records.length > recordsRowsPerPage) {
          const lowerSearch = recordsSearch.toLowerCase()
          records = records.filter(r => {
            const values = Object.values(r.field_values || {}).map(v => {
              if (typeof v === 'object' && v !== null && v.value) return v.value
              return v
            })
            return values.some(val => String(val).toLowerCase().includes(lowerSearch))
          })
        }

        // Set total count
        const total = meta.total || (responseData.pagination ? responseData.pagination.total : records.length)
        setTotalRecords(total)

        setTables(prev => prev.map(t => {
          if (t.id === tableId) {
            const mappedRows = mapBackendRecordsToFrontend(records, t.columns)
            const updatedT = { ...t, rows: mappedRows }
            if (currentTable?.id === tableId) setCurrentTable(updatedT)
            return updatedT
          }
          return t
        }))
      }
    } catch (e) {
      console.error("Error fetching records", e)
    }
  }

  const handleSelectTable = async (table) => {
    setCurrentTable(table)
    setView('edit')
    setLoading(true)
    try {
      // Fetch both table details and columns to ensure full data
      const [tableRes, columnsRes] = await Promise.all([
        datatablesApi.getById(table.id),
        datatablesApi.getColumns(table.id)
      ])

      if (tableRes.data && (tableRes.data.success === true || tableRes.data.status === 'success')) {
        const backendTable = tableRes.data.data
        const columns = (columnsRes.data && (columnsRes.data.success === true || columnsRes.data.status === 'success'))
          ? columnsRes.data.data
          : []

        // Merge columns into backendTable for mapping
        const fullTable = mapBackendTableToFrontend({ ...backendTable, columns })

        // Reset pagination when selecting a table
        setRecordsPage(1)

        setCurrentTable(fullTable)
        setTables(prev => prev.map(t => t.id === table.id ? fullTable : t))
      }
    } catch (error) {
      console.error("Error fetching table details:", error)
      toast.error("Failed to load table details")
    } finally {
      setLoading(false)
    }
  }

  const handleTableDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = tables.findIndex(table => table.id === active.id)
      const newIndex = tables.findIndex(table => table.id === over.id)

      setTables((items) => arrayMove(items, oldIndex, newIndex))
    }
  }

  const essentialTypes = columnTypes.filter(type => type.category === "essential")
  const superUsefulTypes = columnTypes.filter(type => type.category === "super-useful")
  const customTypes = columnTypes.filter(type => type.category === "custom")

  // --- Filtering & Grouping Logic ---
  const filteredTables = tables.filter(table => {
    const matchesSearch = !tablesSearch ||
      (table.table_name || table.name || "").toLowerCase().includes(tablesSearch.toLowerCase()) ||
      (table.description && table.description.toLowerCase().includes(tablesSearch.toLowerCase()))

    const matchesTab = activeTab === "all" ||
      (activeTab === "active" && table.isActive) ||
      (activeTab === "inactive" && !table.isActive)

    return matchesSearch && matchesTab
  })

  // Update total count for pagination whenever filtering changes
  useEffect(() => {
    setTotalTables(filteredTables.length)
  }, [filteredTables.length])

  // Paginated tables for display
  const paginatedTables = filteredTables.slice(
    (tablesPage - 1) * tablesRowsPerPage,
    tablesPage * tablesRowsPerPage
  )

  // Group tables based on selected grouping
  const groupedTables = () => {
    const dataSource = paginatedTables // Use paginated source
    if (dataSource.length === 0) return {}

    if (groupBy === "none") {
      return { "All Tables": dataSource }
    }

    if (groupBy === "status") {
      const active = dataSource.filter(table => table.isActive)
      const inactive = dataSource.filter(table => !table.isActive)
      return {
        "Active Tables": active,
        "Inactive Tables": inactive
      }
    }

    if (groupBy === "date") {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const todayTables = dataSource.filter(table => {
        const createdDate = new Date(table.createdAt || table.created_at)
        return createdDate.toDateString() === today.toDateString()
      })

      const yesterdayTables = dataSource.filter(table => {
        const createdDate = new Date(table.createdAt || table.created_at)
        return createdDate.toDateString() === yesterday.toDateString()
      })

      const weekTables = dataSource.filter(table => {
        const createdDate = new Date(table.createdAt || table.created_at)
        return createdDate >= weekAgo && createdDate < yesterday
      })

      const olderTables = dataSource.filter(table => {
        const createdDate = new Date(table.createdAt || table.created_at)
        return createdDate < weekAgo
      })

      return {
        "Added Today": todayTables,
        "Added Yesterday": yesterdayTables,
        "Added This Week": weekTables,
        "Older Records": olderTables
      }
    }

    return { "All Tables": dataSource }
  }
  // ----------------------------------

  // --- Pagination Helper ---
  const renderPaginationItems = (currentPage, totalCount, rowsPerPage, setPage) => {
    const totalPages = Math.ceil(totalCount / rowsPerPage) || 1
    const items = []
    const maxVisiblePages = 5

    // Previous
    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious
          onClick={() => setPage(Math.max(1, currentPage - 1))}
          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
        />
      </PaginationItem>
    )

    // Page Numbers logic
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => setPage(1)} className="cursor-pointer">1</PaginationLink>
        </PaginationItem>
      )
      if (startPage > 2) {
        items.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis /></PaginationItem>)
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={currentPage === i}
            onClick={() => setPage(i)}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<PaginationItem key="ellipsis-end"><PaginationEllipsis /></PaginationItem>)
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => setPage(totalPages)} className="cursor-pointer">{totalPages}</PaginationLink>
        </PaginationItem>
      )
    }

    // Next
    items.push(
      <PaginationItem key="next">
        <PaginationNext
          onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          className={currentPage >= totalPages || totalCount === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
        />
      </PaginationItem>
    )

    return items
  }
  // -------------------------

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <PageBreadcrumb
        customItems={view === 'edit' ? [
          {
            label: "Table Builder",
            href: "/custom-table-builder",
            onClick: (e) => {
              e.preventDefault()
              setView('list')
              setCurrentTable(null)
            }
          },
          { label: currentTable?.name || "Table Details" }
        ] : null}
      />

      {/* Premium Header Section */}
      {view === 'list' && (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/5 p-4 border border-primary/10">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-accent/5 blur-3xl"></div>

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                    <Database className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Custom Tables</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-medium">
                        DB Builder
                      </Badge>
                      <span className="text-sm text-muted-foreground">Create and manage your custom data schemas</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={fetchTables}
                  disabled={loading}
                  className="h-11 px-5 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                <Button
                  className="h-11 px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 gap-2 font-semibold"
                  disabled={loading}
                  onClick={() => setIsCreatingTable(true)}
                >
                  <Plus className="h-5 w-5" />
                  Create Table
                </Button>

                <TableCreationWizard
                  open={isCreatingTable}
                  onOpenChange={setIsCreatingTable}
                  onComplete={handleWizardComplete}
                  columnTypes={columnTypes}
                />
              </div>
            </div>
          </div>

      {/* Stats Dashboard (Compact Version) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-elevated group hover:border-primary/50 transition-all duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Database className="h-8 w-8 text-blue-500" />
          </div>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Tables</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">{totalTables}</span>
                <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Global</span>
              </div>
              <div className="mt-2 flex items-center text-xs text-muted-foreground">
                <ArrowUpRight className="h-3 w-3 mr-1 text-blue-500" />
                <span>Primary data nodes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated group hover:border-accent/50 transition-all duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Tables</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">
                  {tables.filter(t => t.isActive).length}
                </span>
                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">Healthy</span>
              </div>
              <div className="mt-2 flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                <span>Resources operational</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated group hover:border-orange-200 transition-all duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inactive Tables</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">
                  {tables.filter(t => !t.isActive).length}
                </span>
                <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">Archived</span>
              </div>
              <div className="mt-2 flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1 text-orange-500" />
                <span>Pending reactivation</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated group hover:border-purple-200 transition-all duration-500 overflow-hidden relative text-white bg-gradient-to-br from-purple-600 to-purple-800 border-none">
          <div className="absolute top-0 right-0 p-2 opacity-20">
            <TrendingUp className="h-8 w-8" />
          </div>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-purple-100 uppercase tracking-wider">Growth Factor</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">
                  {tables.filter(t => {
                    const createdDate = new Date(t.createdAt || t.created_at)
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return createdDate >= weekAgo
                  }).length}
                </span>
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">This Week</span>
              </div>
              <div className="mt-2 flex items-center text-xs text-purple-200">
                <Activity className="h-3 w-3 mr-1" />
                <span>New tables created</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        </>
      )}


      {/* Legacy/Edit View Header logic when view !== 'list' */}
      {view !== 'list' && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{currentTable?.name}</h1>
            <p className="text-muted-foreground">{currentTable?.description}</p>
          </div>
          {/* Create Table button is not shown in edit view, which is fine */}
        </div>
      )}


      {/* Refined Controls Bar */}
      {view === 'list' && (
        <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between bg-card p-6 rounded-2xl border shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            {/* Enhanced Search */}
            <div className="relative group flex-1 sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search by table name or description..."
                value={tablesSearch}
                onChange={(e) => setTablesSearch(e.target.value)}
                className="pl-10 h-10 w-full bg-muted/30 border-none focus-visible:ring-primary focus-visible:bg-background transition-all pr-10"
              />
              {tablesSearch && (
                <X
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  onClick={() => setTablesSearch("")}
                />
              )}
            </div>

            {/* Styled Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="bg-muted/30 p-1 h-10 border-none">
                <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  All
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none text-[10px]">
                    {tables.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  Active
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 border-none text-[10px]">
                    {tables.filter(t => t.isActive).length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="inactive" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  Inactive
                  <Badge variant="secondary" className="ml-2 bg-gray-200 text-gray-700 border-none text-[10px]">
                    {tables.filter(t => !t.isActive).length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            {/* Balanced Grouping Select */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Sort & Group:</span>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-44 h-10 bg-muted/30 border-none focus:ring-primary">
                  <SelectValue placeholder="Select grouping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default Listing</SelectItem>
                  <SelectItem value="status">By Connectivity</SelectItem>
                  <SelectItem value="date">By Creation Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-border hidden sm:block mx-2"></div>

            {/* High-end View Toggles */}
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl">
              <Button
                variant={tableListViewMode === "card" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTableListViewMode("card")}
                className={`h-8 px-3 gap-2 rounded-lg transition-all ${tableListViewMode === 'card' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="text-xs font-bold">Grid</span>
              </Button>
              <Button
                variant={tableListViewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTableListViewMode("list")}
                className={`h-8 px-3 gap-2 rounded-lg transition-all ${tableListViewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                <List className="h-4 w-4" />
                <span className="text-xs font-bold">List</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tables Display Area */}
      {view === 'list' ? (
        <>
          <div className="space-y-10">
            {Object.entries(groupedTables()).map(([groupName, groupTables]) => {
              if (groupTables.length === 0) return null

              return (
                <div key={groupName} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-extrabold tracking-tight text-foreground">{groupName}</h2>
                    <div className="h-6 w-px bg-border"></div>
                    <Badge variant="outline" className="rounded-full bg-background font-bold px-3">
                      {groupTables.length} Total
                    </Badge>
                  </div>

                  {tableListViewMode === 'card' ? (
                    // Updated Card View
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupTables.map((table) => (
                        <Card key={table.id} className="card-elevated group flex flex-col border-none hover:ring-2 hover:ring-primary/20 transition-all duration-300">
                          <CardHeader className="pb-4 pt-6 px-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                  <Database className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <CardTitle
                                    className="text-lg font-bold truncate hover:text-primary transition-colors cursor-pointer"
                                    onClick={() => handleSelectTable(table)}
                                  >
                                    {table.name}
                                  </CardTitle>
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-full hover:bg-muted">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl border-primary/5">
                                  <DropdownMenuItem
                                    className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary"
                                    onClick={() => handleSelectTable(table)}
                                  >
                                    <Eye className="h-4 w-4 mr-3" />
                                    <span className="font-semibold">View Data Hub</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary" onClick={() => handleSelectTable(table)}>
                                    <Settings className="h-4 w-4 mr-3" />
                                    <span className="font-semibold">Settings</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => deleteTable(table.id)}
                                    className="rounded-lg text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-3" />
                                    <span className="font-semibold">Delete Record</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-0 flex-1 flex flex-col justify-between px-6 pb-6">
                            <div className="flex-1">
                              <div className="bg-muted/30 rounded-xl p-4 mb-4 min-h-[72px]">
                                {table.description ? (
                                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                    {table.description}
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground/50 italic flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3" /> No description available
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                                  {table.columns.length} Columns
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(table.isActive)}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(table.createdAt || table.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                className="w-full justify-between group-hover:border-primary/50 group-hover:text-primary transition-all"
                                onClick={() => handleSelectTable(table)}
                              >
                                <span className="font-semibold">Access Table</span>
                                <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    // Updated List View
                    <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
                      <Table className="w-full">
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="w-[60px]"></TableHead>
                            <TableHead className="font-bold">Table Identity</TableHead>
                            <TableHead className="font-bold">Description</TableHead>
                            <TableHead className="text-center font-bold">Structure</TableHead>
                            <TableHead className="text-center font-bold">Status</TableHead>
                            <TableHead className="text-right font-bold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupTables.map((table) => (
                            <TableRow
                              key={table.id}
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleSelectTable(table)}
                            >
                              <TableCell>
                                <div className="p-2 bg-primary/10 rounded-lg inline-flex items-center justify-center">
                                  <Database className="h-4 w-4 text-primary" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground">{table.name}</span>
                                  <span className="text-xs text-muted-foreground font-mono">ID: {String(table.id).slice(0, 8)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-md">
                                {table.description ? (
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {table.description}
                                  </p>
                                ) : (
                                  <span className="text-muted-foreground/40 italic text-sm">No description</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="bg-background">{table.columns.length} Fields</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  {getStatusBadge(table.isActive)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); handleSelectTable(table); }}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteTable(table.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Tables Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t mt-4 bg-muted/5 rounded-xl border">
            <div className="text-sm font-medium text-muted-foreground order-2 sm:order-1">
              Showing <span className="text-foreground">{((tablesPage - 1) * tablesRowsPerPage) + 1}</span> to{' '}
              <span className="text-foreground">{Math.min(tablesPage * tablesRowsPerPage, totalTables)}</span> of{' '}
              <span className="text-foreground">{totalTables}</span> entries
            </div>

            <div className="order-1 sm:order-2">
              <Pagination className="justify-end w-auto mx-0">
                <PaginationContent>
                  {renderPaginationItems(tablesPage, totalTables, tablesRowsPerPage, setTablesPage)}
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => {
                setView('list')
                setCurrentTable(null)
              }} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </Button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={recordsSearch}
                onChange={(e) => setRecordsSearch(e.target.value)}
                className="pl-8 pr-8"
              />
              {recordsSearch && (
                <X
                  className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setRecordsSearch("")
                  }}
                />
              )}
            </div>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleTableDragEnd}
          >
            <SortableTable
              key={currentTable.id}
              table={currentTable}
              onTableClick={() => { }} // No-op in dedicated view
              onDeleteTable={() => deleteTable(currentTable.id)}
              onAddColumn={() => openAddColumnModal(currentTable)}
              onAddRow={() => addRow(currentTable.id)}
              currentTable={currentTable}
              onUpdateColumns={updateColumns}
              onUpdateTables={setTables}
              tables={tables}
              setTables={setTables}
              onToggleStatus={toggleTableStatus}
              loading={loading}
              onUpdateTableDetails={updateTableDetails}
              onFetchRecords={fetchRecords}
              records={currentTable.rows ? (currentTable.rows.length > recordsRowsPerPage ? currentTable.rows.slice((recordsPage - 1) * recordsRowsPerPage, recordsPage * recordsRowsPerPage) : currentTable.rows) : []}
              countries={countries}
            />
          </DndContext>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t mt-4">
            <div className="text-sm font-medium text-muted-foreground order-2 sm:order-1">
              Showing <span className="text-foreground">{((recordsPage - 1) * recordsRowsPerPage) + 1}</span> to{' '}
              <span className="text-foreground">{Math.min(recordsPage * recordsRowsPerPage, totalRecords)}</span> of{' '}
              <span className="text-foreground">{totalRecords}</span> entries
            </div>

            <div className="order-1 sm:order-2">
              <Pagination className="justify-end w-auto mx-0">
                <PaginationContent>
                  {renderPaginationItems(recordsPage, totalRecords, recordsRowsPerPage, setRecordsPage)}
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      <Dialog open={isAddingColumn} onOpenChange={setIsAddingColumn}>
        <DialogContent className="sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[1400px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0 border-b pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle>Batch Create Columns</DialogTitle>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="px-3 py-1">
                  {addedColumns.length} Column(s) Pending
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - List of columns being added */}
            <div className="w-[300px] border-r bg-muted/20 flex flex-col">
              <div className="p-4 border-b bg-background/50 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Columns to Add</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    const newList = [...addedColumns, createDefaultColumn()]
                    setAddedColumns(newList)
                    setActiveColumnIndex(newList.length - 1)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Another
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {addedColumns.map((col, idx) => {
                    const typeInfo = columnTypes.find(t => t.value === col.type) || columnTypes[0]
                    return (
                      <div
                        key={col.id}
                        className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${activeColumnIndex === idx
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-muted"
                          }`}
                        onClick={() => setActiveColumnIndex(idx)}
                      >
                        <typeInfo.icon className={`h-4 w-4 shrink-0 ${activeColumnIndex === idx ? "" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{col.name || 'Untitled'}</p>
                          <p className={`text-[10px] ${activeColumnIndex === idx ? "opacity-80" : "text-muted-foreground"}`}>{typeInfo.label}</p>
                        </div>
                        {addedColumns.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ${activeColumnIndex === idx ? "hover:bg-white/20 text-white" : "hover:bg-destructive/10 text-destructive"
                              }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              const newList = addedColumns.filter((_, i) => i !== idx)
                              setAddedColumns(newList)
                              setActiveColumnIndex(Math.max(0, idx - 1))
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div >
              </ScrollArea >
            </div >

            {/* Right Side - Active Column Configuration */}
            {
              addedColumns[activeColumnIndex] && (
                <div className="flex-1 flex flex-col bg-background">
                  <div className="flex-1 flex overflow-hidden">
                    {/* Sub-sidebar for Type Selection */}
                    <div className="w-[280px] border-r bg-muted/10 p-4 overflow-y-auto">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Choose Field Type</h4>
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-2 px-2">ESSENTIAL</p>
                          <div className="grid grid-cols-1 gap-1">
                            {essentialTypes.map(type => (
                              <Button
                                key={type.value}
                                variant={addedColumns[activeColumnIndex].type === type.value ? "default" : "ghost"}
                                className="justify-start h-9 px-3 text-xs"
                                onClick={() => {
                                  const newList = [...addedColumns]
                                  newList[activeColumnIndex] = { ...newList[activeColumnIndex], type: type.value }
                                  setAddedColumns(newList)
                                }}
                              >
                                <type.icon className="h-3.5 w-3.5 mr-2" />
                                {type.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-2 px-2">PROFESSIONAL</p>
                          <div className="grid grid-cols-1 gap-1">
                            {superUsefulTypes.map(type => (
                              <Button
                                key={type.value}
                                variant={addedColumns[activeColumnIndex].type === type.value ? "default" : "ghost"}
                                className="justify-start h-9 px-3 text-xs"
                                onClick={() => {
                                  const newList = [...addedColumns]
                                  newList[activeColumnIndex] = { ...newList[activeColumnIndex], type: type.value }
                                  setAddedColumns(newList)
                                }}
                              >
                                <type.icon className="h-3.5 w-3.5 mr-2" />
                                {type.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-2 px-2">CUSTOM</p>
                          <div className="grid grid-cols-1 gap-1">
                            {customTypes.map(type => (
                              <Button
                                key={type.value}
                                variant={addedColumns[activeColumnIndex].type === type.value ? "default" : "ghost"}
                                className="justify-start h-9 px-3 text-xs"
                                onClick={() => {
                                  const newList = [...addedColumns]
                                  newList[activeColumnIndex] = { ...newList[activeColumnIndex], type: type.value }
                                  setAddedColumns(newList)
                                }}
                              >
                                <type.icon className="h-3.5 w-3.5 mr-2" />
                                {type.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Config Area */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background/50">
                      <div className="flex-1 overflow-y-auto p-8 lg:p-12 scrollbar-thin">
                        <div className="max-w-2xl mx-auto">
                          <div className="mb-6 pb-6 border-b">
                            <h2 className="text-xl font-bold">Configure {addedColumns[activeColumnIndex].name || 'Column'}</h2>
                            <p className="text-sm text-muted-foreground mt-1">Set up properties and validation for this field</p>
                          </div>
                          <ColumnConfigPanel
                            column={addedColumns[activeColumnIndex]}
                            onUpdate={(updates) => {
                              const newList = [...addedColumns]
                              newList[activeColumnIndex] = { ...newList[activeColumnIndex], ...updates }
                              setAddedColumns(newList)
                            }}
                            columnTypes={columnTypes}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t bg-muted/10 flex justify-end gap-3 px-8">
                    <Button variant="outline" onClick={() => setIsAddingColumn(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addColumn} disabled={loading} className="px-8 shadow-lg transition-transform hover:scale-105 active:scale-95">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                      Create {addedColumns.length} Column(s)
                    </Button>
                  </div>
                </div>
              )
            }
          </div >
        </DialogContent >
      </Dialog >

      {/* Empty State */}
      {
        tables.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Tables Created</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Create your first custom table to start organizing and managing your data in a flexible spreadsheet-like interface.
            </p>
            <Button onClick={() => setIsCreatingTable(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Table
            </Button>
          </div>
        )
      }
    </div >
  )
}