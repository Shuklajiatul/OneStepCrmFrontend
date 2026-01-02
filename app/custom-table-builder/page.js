"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Save, X, Trash2, Settings, Type, Hash, Calendar, CheckSquare, Database, Mail, Phone, Users, FileText, List, Calculator, User, Sparkles, GripVertical, Loader2, ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { authUtils } from "@/lib/auth-utils"
import { recordsApi, datatablesApi } from "@/lib/api-endpoint" // Added recordsApi
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


const columnTypes = [
  // Essential Types
  { value: "text", label: "Text", icon: Type, category: "essential" },
  { value: "email", label: "Email", icon: Mail, category: "essential" },
  { value: "number", label: "Number", icon: Hash, category: "essential" },
  { value: "textarea", label: "Textarea", icon: FileText, category: "essential" },
  { value: "formula", label: "Formula", icon: Calculator, category: "essential" },
  { value: "status", label: "Status", icon: CheckSquare, category: "essential" },
  { value: "file", label: "File", icon: FileText, category: "essential" },

  // Super Useful Types
  { value: "date", label: "Date", icon: Calendar, category: "super-useful" },
  { value: "datetime", label: "DateTime", icon: Calendar, category: "super-useful" },
  { value: "phone", label: "Phone", icon: Phone, category: "super-useful" },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare, category: "super-useful" },
  { value: "select", label: "Select", icon: List, category: "super-useful" },
  { value: "radio", label: "Radio", icon: CheckSquare, category: "super-useful" },
  { value: "people", label: "People", icon: Users, category: "super-useful" },
  { value: "dropdown", label: "Dropdown", icon: List, category: "super-useful" },
  { value: "custom", label: "Custom Type", icon: Sparkles, category: "custom" },
]


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
              <Badge
                variant={isActive ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
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
function SortableTable({ table, onTableClick, onDeleteTable, onAddColumn, onAddRow, currentTable, onUpdateColumns, onUpdateTables, tables, setTables, onToggleStatus, loading, onUpdateTableDetails, onFetchRecords }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: table.id })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
        initialFormState[column.id] = { countryCode: '', number: '' }
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
      table.columns.forEach(column => {
        const payloadValue = buildFieldValuePayload(column, recordFormData[column.id])
        if (payloadValue !== null) {
          fieldValues[column.id] = payloadValue
        }
      })

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

      // Phone
      if (fieldType === 'phone') {
        return (
          <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1' : ''} space-y-2`}>
            <Label>{fieldName}</Label>
            <Input
              value={storedValue || ''}
              onChange={e => handleRecursiveFieldChange(fieldId, e.target.value, path)}
              placeholder="Enter phone"
            />
          </div>
        )
      }

      // Select/Radio
      if ((fieldType === 'select' || fieldType === 'radio') && columnOptions.length > 0) {
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

      // Checkbox
      if (fieldType === 'checkbox' && columnOptions.length > 0) {
        const checkboxSelections = Array.isArray(storedValue)
          ? storedValue.map(item => typeof item === 'object' ? item.value : item)
          : []

        return (
          <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1' : ''} space-y-2`}>
            <Label>{fieldName}</Label>
            <div className="space-y-2">
              {columnOptions.map((opt, i) => {
                const optVal = typeof opt === 'object' ? (opt.value || opt.label) : opt
                const optLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt
                const isChecked = checkboxSelections.includes(optVal)
                const selectionIdx = isChecked ? (storedValue || []).findIndex(s => (s.value || s) === optVal) : -1

                return (
                  <div key={i} className="space-y-2">
                    <div onClick={() => handleRecursiveCheckboxToggle(fieldId, optVal, path)} className="flex items-center gap-2 cursor-pointer">
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${isChecked ? 'bg-primary border-primary' : 'border-input'}`}>
                        {isChecked && <div className="h-2 w-2 bg-primary-foreground rounded-sm" />}
                      </div>
                      <span className="text-sm">{optLabel}</span>
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
          ) : (
            <Input value={primitiveValue} onChange={e => handleRecursiveFieldChange(fieldId, e.target.value, path)} type={fieldType === 'number' ? 'number' : 'text'} />
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
              <Badge
                variant={table.isActive ? "default" : "secondary"}
                className={`cursor-pointer hover:opacity-80 mr-2 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus(table.id, table.isActive);
                }}
              >
                {table.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddColumn}
              >
                <Plus className="h-3 w-3" />
                Add Column
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsSettingsOpen(true)}
                title="Table Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
              {
                /* Replaced direct Add Row with Dialog Trigger via onAddRow which now opens dialog */
              }
              <Button
                variant="outline"
                size="sm"
                onClick={openAddRecordDialog}
                className="gap-1 h-8"
              >
                <Plus className="h-3 w-3" />
                Add Record
              </Button>
              <Button
                variant={currentTable?.id === table.id ? "default" : "outline"}
                size="sm"
                onClick={() => onTableClick(table)}
                className="h-8"
              >
                {currentTable?.id === table.id ? "Collapse" : "Expand"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeleteTable}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
              if (fieldType === 'checkbox' || fieldType === 'select' || fieldType === 'radio') {
                // Reuse the recursive function for top-level complex fields
                return renderFormFieldsRecursive([{
                  id: column.id,
                  column_name: column.name,
                  type: fieldType,
                  options: columnOptions,
                  properties: column.properties,
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
                    <div className="grid grid-cols-12 gap-2">
                      <Input className="col-span-4" placeholder="+91" value={fieldValue?.countryCode || ''} onChange={e => handleRecursiveFieldChange(column.id, { ...(fieldValue || {}), countryCode: e.target.value }, [])} />
                      <Input className="col-span-8" placeholder="Number" value={fieldValue?.number || ''} onChange={e => handleRecursiveFieldChange(column.id, { ...(fieldValue || {}), number: e.target.value }, [])} />
                    </div>
                  ) : (
                    <Input
                      type={fieldType === 'number' ? 'number' : 'text'}
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
          column={column}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </div>
    </TableHead>
  )
}

// Table Content Component
function TableContent({ table, onUpdateColumns, onUpdateTables, tables, setTables, onFetchRecords, onAddRecord }) {
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
      if (column.type === 'date' && val) return format(new Date(val), "PPP")
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
        primaryDisplay = primaryVal.number ? `${primaryVal.countryCode || ''} ${primaryVal.number}` : JSON.stringify(primaryVal)
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
        return value.number ? `${value.countryCode || ''} ${value.number}` : JSON.stringify(value)
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
                  <TableHead className="w-12 bg-muted/50 border-l border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onAddRecord}
                      title="Add row"
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map(row => (
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
                    <TableCell className="w-12 border-l border-border">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(row.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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

function ColumnSettings({ column, onUpdate, onDelete }) {
  const [isOpen, setIsOpen] = useState(false)

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Column Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Column Type</label>
            <Select
              value={column.type}
              onValueChange={(type) => onUpdate({ type })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columnTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Editable</label>
            <input
              type="checkbox"
              checked={column.editable}
              onChange={(e) => onUpdate({ editable: e.target.checked })}
              className="h-4 w-4"
            />
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete()
                setIsOpen(false)
              }}
            >
              Delete Column
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
    case "dropdown":
      return (
        <Select value={inputValue} onValueChange={setInputValue} onOpenChange={(open) => !open && handleSave()}>
          <SelectTrigger ref={inputRef} className="h-8">
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
      )
    default:
      return (
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-8"
        />
      )
  }
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

    // Ensure options are simple strings for the dropdown if they are objects
    const simpleOptions = parsedOptions.map(opt =>
      typeof opt === 'object' ? (opt.label || opt.value || JSON.stringify(opt)) : opt
    )

    return {
      id: col.column_id || col.id,
      name: col.column_name || col.name,
      type: uiType,
      editable: true,
      isSearchable: col.is_searchable ?? true,
      options: simpleOptions,
      rawOptions: parsedOptions, // Keep raw options for advanced usage usually
      required: col.required ?? false,
      properties: col.properties || {},
      parentDatatype: col.parent_datatype // Store original parent type
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

const mapFrontendColumnToBackend = (column) => ({
  column_name: column.name,
  data_type: column.type,
  is_searchable: column.isSearchable ?? true,
  properties: column.properties || {},
  optional_values: column.options || [],
  required: column.required ?? false
})

export default function CustomTableBuilder() {
  const [tables, setTables] = useState([])
  const [currentTable, setCurrentTable] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'edit'
  const [isCreatingTable, setIsCreatingTable] = useState(false)
  const [newTableName, setNewTableName] = useState("")
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnConfig, setNewColumnConfig] = useState({
    name: "",
    type: "text",
    options: []
  })
  const [loading, setLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchTables()
  }, [])


  const fetchTables = async () => {
    setLoading(true)
    try {
      const response = await datatablesApi.getAll()
      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const rawTables = response.data.data
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

  const createNewTable = async () => {
    if (!newTableName.trim()) {
      toast.error("Please enter a table name")
      return
    }

    try {
      setLoading(true)
      const response = await datatablesApi.create({
        table_name: newTableName.trim(),
        description: "Table created via Custom Table Builder",
        is_active: true
      })

      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const newTable = mapBackendTableToFrontend(response.data.data)
        setTables([newTable, ...tables])
        setCurrentTable(newTable)
        setView('edit')
        setNewTableName("")
        setIsCreatingTable(false)
        toast.success("Table created! Now let's add some columns.")
        setIsAddingColumn(true) // Automatically prompt to add columns
      }
    } catch (error) {
      console.error("Error creating table:", error)
      toast.error("Failed to create table")
    } finally {
      setLoading(false)
    }
  }

  const openAddColumnModal = (table = currentTable) => {
    if (!table) return
    setCurrentTable(table)
    setNewColumnConfig({
      name: "",
      type: "text",
      options: []
    })
    setIsAddingColumn(true)
  }

  const addColumn = async () => {
    if (!newColumnConfig.name.trim()) {
      toast.error("Please enter a column name")
      return
    }

    const targetTable = currentTable
    if (!targetTable) return

    try {
      setLoading(true)
      const columnData = mapFrontendColumnToBackend({
        name: newColumnConfig.name.trim(),
        type: newColumnConfig.type,
        options: newColumnConfig.options
      })

      const response = await datatablesApi.addColumn(targetTable.id, [columnData])

      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const tableRes = await datatablesApi.getById(targetTable.id)
        if (tableRes.data && (tableRes.data.success === true || tableRes.data.status === 'success')) {
          const updatedTable = mapBackendTableToFrontend(tableRes.data.data)
          const updatedTables = tables.map(table =>
            table.id === targetTable.id ? updatedTable : table
          )
          setTables(updatedTables)
          setCurrentTable(updatedTable)
          setIsAddingColumn(false)
          toast.success("Column added successfully!")
        }
      }
    } catch (error) {
      console.error("Error adding column:", error)
      toast.error("Failed to add column")
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

  const fetchRecords = async (tableId) => {
    try {
      const response = await recordsApi.getAll(tableId)
      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const records = response.data.data || []
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

        // Fetch records
        try {
          const recRes = await recordsApi.getAll(table.id)
          if (recRes.data && (recRes.data.success === true || recRes.data.status === 'success')) {
            fullTable.rows = mapBackendRecordsToFrontend(recRes.data.data || [], fullTable.columns)
          }
        } catch (e) {
          console.error("Failed to fetch records", e)
        }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Tables</h1>
          <p className="text-muted-foreground">Create and manage your custom data tables</p>
        </div>

        <Dialog open={isCreatingTable} onOpenChange={setIsCreatingTable}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              New Table
            </Button>
          </DialogTrigger>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing...
            </div>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Table</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Table Name</label>
                <Input
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Enter table name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createNewTable()
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreatingTable(false)}>
                  Cancel
                </Button>
                <Button onClick={createNewTable}>
                  Create Table
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Content */}
      {view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map(table => (
            <Card
              key={table.id}
              className="hover:border-primary cursor-pointer transition-colors group relative"
              onClick={() => handleSelectTable(table)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{table.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{table.columns.length} columns</p>
                    </div>
                  </div>
                  <Badge variant={table.isActive ? "default" : "secondary"}>
                    {table.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {table.description || "No description provided"}
                </p>
                <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="gap-2">
                    Manage <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setView('list')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Button>
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
            />
          </DndContext>
        </div>
      )}

      {/* Add Column Modal */}
      <Dialog open={isAddingColumn} onOpenChange={setIsAddingColumn}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Column Name</label>
              <Input
                value={newColumnConfig.name}
                onChange={(e) => setNewColumnConfig({ ...newColumnConfig, name: e.target.value })}
                placeholder="Enter column name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">Column Type</label>

              {/* Essential Types */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Essential Types</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {essentialTypes.map(type => (
                    <Button
                      key={type.value}
                      variant={newColumnConfig.type === type.value ? "default" : "outline"}
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setNewColumnConfig({ ...newColumnConfig, type: type.value })}
                    >
                      <type.icon className="h-4 w-4 mr-2" />
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Super Useful Types */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Super Useful</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {superUsefulTypes.map(type => (
                    <Button
                      key={type.value}
                      variant={newColumnConfig.type === type.value ? "default" : "outline"}
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setNewColumnConfig({ ...newColumnConfig, type: type.value })}
                    >
                      <type.icon className="h-4 w-4 mr-2" />
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Types */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Custom</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {customTypes.map(type => (
                    <Button
                      key={type.value}
                      variant={newColumnConfig.type === type.value ? "default" : "outline"}
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setNewColumnConfig({ ...newColumnConfig, type: type.value })}
                    >
                      <type.icon className="h-4 w-4 mr-2" />
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Options based on type */}
            {(newColumnConfig.type === "dropdown" || newColumnConfig.type === "status") && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {newColumnConfig.type === "dropdown" ? "Dropdown Options" : "Status Options"}
                </label>
                <div className="space-y-2">
                  {newColumnConfig.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newColumnConfig.options]
                          newOptions[index] = e.target.value
                          setNewColumnConfig({ ...newColumnConfig, options: newOptions })
                        }}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newOptions = newColumnConfig.options.filter((_, i) => i !== index)
                          setNewColumnConfig({ ...newColumnConfig, options: newOptions })
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setNewColumnConfig({
                      ...newColumnConfig,
                      options: [...newColumnConfig.options, ""]
                    })}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsAddingColumn(false)}>
                Cancel
              </Button>
              <Button onClick={addColumn}>
                Add Column
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {tables.length === 0 && (
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
      )}
    </div>
  )
}