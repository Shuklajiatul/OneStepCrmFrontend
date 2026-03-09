"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  cn,
  getStatusBadge,
  parseOptionalValuesArray,
  getColumnFieldType,
  getColumnOptions,
  buildFieldValuePayload,
  updateNestedState,
  mapBackendTableToFrontend,
  mapBackendRecordsToFrontend,
  mapFrontendColumnToBackend
} from "@/lib/utils"
import { RecordModal } from "@/components/records/RecordModal"
import { PhoneInput } from "@/components/records/PhoneInput"
import { LocationPicker } from "@/components/records/LocationPicker"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { v4 as uuidv4 } from 'uuid'
import { ColumnConfigPanel } from "./components/column-config-panel"
import { TableCreationWizard } from "./components/table-creation-wizard"
import { authUtils } from "@/lib/auth-utils"
import { recordsApi, datatablesApi } from "@/lib/api-endpoint"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { useSearchParams } from "next/navigation"
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
import { Fragment } from 'react'


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
function SortableTable({ table, onTableClick, onDeleteTable, onAddColumn, onAddRow, currentTable, onUpdateColumns, onUpdateTables, tables, setTables, onToggleStatus, loading, onUpdateTableDetails, onFetchRecords, records, countries: phoneCountries }) {
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

  // -- Record Creation State --
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false)

  const openAddRecordDialog = () => {
    setIsAddRecordDialogOpen(true)
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
                  {table.rows.length} rows
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
            countries={phoneCountries}
            loading={loading}
          />
        )}
      </Card>

      {/* Add Record Modal */}
      <RecordModal
        open={isAddRecordDialogOpen}
        onOpenChange={setIsAddRecordDialogOpen}
        table={table}
        countries={phoneCountries}
        onSuccess={() => onFetchRecords(table.id)}
      />

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
function TableContent({ table, onUpdateColumns, onUpdateTables, tables, setTables, onFetchRecords, onAddRecord, records, countries, loading }) {
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
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-muted/50">
                      {table.columns.map(column => (
                        <TableCell key={`${i}-${column.id}`} className="border-r border-border last:border-r-0 py-4">
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (records || table.rows || []).map(row => (
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
      <DialogContent className="sm:max-w-[90vw] lg:max-w-[1000px] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="text-xl font-semibold">Column Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col bg-background/50 min-h-0 overflow-hidden">
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

        <div className="p-6 border-t bg-background flex justify-between items-center shadow-lg shrink-0">
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


export default function CustomTableBuilderClient({
  initialTables = [],
  initialCurrentTable = null,
  initialRecords = []
}) {
  const [tables, setTables] = useState(initialTables)
  const [currentTable, setCurrentTable] = useState(initialCurrentTable)
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

  const [records, setRecords] = useState(initialRecords)
  const [phoneCountries, setPhoneCountries] = useState([])

  useEffect(() => {
    const loadCountries = async () => {
      const data = await fetchPhoneCountries()
      setPhoneCountries(data)
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

  const searchParams = useSearchParams()
  const preselectedTableId = searchParams.get('tableId')

  // Ref for strict mode double-call prevention
  const tableDataLoadedRef = useRef(false)

  useEffect(() => {
    if (initialTables.length > 0) {
      tableDataLoadedRef.current = true
      return
    }
    if (tableDataLoadedRef.current) return
    tableDataLoadedRef.current = true
    fetchTables()
  }, [initialTables])

  // Auto-select table from URL query param (e.g. from dashboard Recent Tables click)
  useEffect(() => {
    if (!preselectedTableId || tables.length === 0 || currentTable) return

    // If we have an initialCurrentTable, check if it matches the preselected ID
    if (initialCurrentTable && initialCurrentTable.id === preselectedTableId) return

    const match = tables.find(t => t.id === preselectedTableId)
    if (match) {
      handleSelectTable(match)
    }
  }, [preselectedTableId, tables.length, initialCurrentTable])


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

        // Set total count
        const total = meta.total || (responseData.pagination ? responseData.pagination.total : rawTables.length)
        setTotalTables(total)

        const mappedTables = rawTables.map(mapBackendTableToFrontend)
        setTables(mappedTables)
      }
    } catch (error) {
      const errorMsg = `Access Denied - view feature not found for this table in policies: ${error.message}`
      setError(errorMsg)
      console.error("Error fetching table data:", error)
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

  // Guard to prevent duplicate fetches for the same table
  const recordsLoadedRef = useRef(null)

  useEffect(() => {
    if (!currentTable?.id) {
      recordsLoadedRef.current = null; // Reset when no table is selected
      return
    }
    if (recordsLoadedRef.current === currentTable.id) return

    recordsLoadedRef.current = currentTable.id
    fetchRecords(currentTable.id)
  }, [currentTable?.id])

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


  // --- Filtered Records for SortableTable ---
  const filteredRecords = useMemo(() => {
    let rows = currentTable?.rows || []

    if (recordsSearch) {
      const lowerSearch = recordsSearch.toLowerCase()
      rows = rows.filter(r => {
        // Adapt logic from original fetchRecords to use cells
        const values = Object.values(r.cells || {}).map(v => {
          if (typeof v === 'object' && v !== null && v.value) return v.value
          return v
        })
        return values.some(val => String(val).toLowerCase().includes(lowerSearch))
      })
    }
    return rows
  }, [currentTable?.rows, recordsSearch])

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
          <div className="relative overflow-hidden rounded-2xl from-primary/10 to-accent/5 p-4 border border-primary/10">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-accent/5 blur-3xl"></div>

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
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
                    {/* <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">Healthy</span> */}
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
          {loading && tables.length === 0 ? (
            <div className="space-y-6 animate-pulse mt-10">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-32 bg-muted-foreground/10" />
                <div className="h-6 w-px bg-border"></div>
                <Skeleton className="h-6 w-20 rounded-full bg-muted-foreground/10" />
              </div>

              {tableListViewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Card key={i} className="card-elevated border-none h-[260px] flex flex-col">
                      <CardHeader className="pb-3 pt-5 px-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                            <Skeleton className="h-5 w-3/4" />
                          </div>
                          <Skeleton className="h-7 w-7 rounded-sm shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="px-5 pb-5 flex-1 flex flex-col justify-between">
                        <div>
                          <Skeleton className="h-[60px] w-full rounded-md mb-3" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <div className="flex items-center gap-1">
                              <Skeleton className="h-3 w-3 rounded-full" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-9 w-full rounded-md" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
                  <Table className="w-full">
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[60px]"></TableHead>
                        <TableHead>Table Identity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Structure</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3, 4, 5].map(i => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-8 w-8 rounded-lg" /></TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-4 w-full max-w-[200px]" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Skeleton className="h-8 w-8 rounded-md" />
                              <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              {tables.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl border-dashed bg-muted/10 h-64 mt-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <Database className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">No tables found</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    You haven't created any custom tables yet, or your search didn't match any results.
                  </p>
                  <Button variant="outline" className="mt-6" onClick={() => setIsCreatingTable(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Table
                  </Button>
                </div>
              )}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {groupTables.map((table) => (
                          <Card key={table.id} className="card-elevated group flex flex-col border-none hover:ring-2 hover:ring-primary/20 transition-all duration-300">
                            <CardHeader className="pb-3 pt-5 px-5">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                    <Database className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <CardTitle
                                      className="text-base font-semibold truncate hover:text-primary transition-colors cursor-pointer"
                                      onClick={() => handleSelectTable(table)}
                                    >
                                      {table.name}
                                    </CardTitle>
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-7 h-7 p-0 rounded-full hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl border-primary/5">
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectTable(table);
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Data
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectTable(table);
                                      }}
                                    >
                                      <Settings2 className="h-4 w-4 mr-2" />
                                      Table Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteTable(table.id);
                                      }}
                                      className="text-destructive cursor-pointer focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Table
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>

                            <CardContent className="pt-0 flex-1 flex flex-col justify-between px-5 pb-5">
                              <div className="flex-1">
                                <div className="bg-muted/20 rounded-lg p-3 mb-3 min-h-[60px]">
                                  {table.description ? (
                                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                      {table.description}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground/50 italic flex items-center gap-1.5">
                                      <AlertCircle className="h-2.5 w-2.5" /> No description
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {/* <Badge variant="secondary" className="text-xs bg-primary/5 text-primary border-primary/10 px-2 py-0.5">
                                  {table.columns.length} Columns
                                </Badge> */}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    {getStatusBadge(table.isActive)}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {new Date(table.createdAt || table.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </div>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-between h-9 group-hover:border-primary/50 group-hover:text-primary transition-all"
                                  onClick={() => handleSelectTable(table)}
                                >
                                  <span className="text-sm font-semibold">Access Table</span>
                                  <ArrowLeft className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:translate-x-0.5" />
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
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-full hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl border-primary/5">
                                        <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectTable(table);
                                          }}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Data
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectTable(table);
                                          }}
                                        >
                                          <Settings2 className="h-4 w-4 mr-2" />
                                          Table Settings
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteTable(table.id);
                                          }}
                                          className="text-destructive cursor-pointer focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Table
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
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
          )}

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
              records={filteredRecords.slice((recordsPage - 1) * recordsRowsPerPage, recordsPage * recordsRowsPerPage)}
              countries={phoneCountries}
            />
          </DndContext>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t mt-4">
            <div className="text-sm font-medium text-muted-foreground order-2 sm:order-1">
              Showing <span className="text-foreground">{((recordsPage - 1) * recordsRowsPerPage) + 1}</span> to{' '}
              <span className="text-foreground">{Math.min(recordsPage * recordsRowsPerPage, filteredRecords.length)}</span> of{' '}
              <span className="text-foreground">{filteredRecords.length}</span> entries
            </div>

            <div className="order-1 sm:order-2">
              <Pagination className="justify-end w-auto mx-0">
                <PaginationContent>
                  {renderPaginationItems(recordsPage, filteredRecords.length, recordsRowsPerPage, setRecordsPage)}
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

          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Sidebar - List of columns being added */}
            <div className="w-[300px] border-r bg-muted/20 flex flex-col min-h-0">
              <div className="p-4 border-b bg-background/50 flex items-center justify-between shrink-0">
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
              <ScrollArea className="flex-1 min-h-0">
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
                <div className="flex-1 flex flex-col bg-background min-h-0">
                  <div className="flex-1 flex overflow-hidden min-h-0">
                    {/* Sub-sidebar for Type Selection */}
                    <div className="w-[280px] border-r bg-muted/10 p-4 flex flex-col min-h-0">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 shrink-0">Choose Field Type</h4>
                      <ScrollArea className="flex-1 min-h-0">
                        <div className="space-y-6 pr-2">
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
                      </ScrollArea>
                    </div>

                    {/* Main Config Area */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background/50">
                      <ScrollArea className="flex-1 min-h-0">
                        <div className="p-8 lg:p-12 scrollbar-thin max-w-2xl mx-auto">
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
                      </ScrollArea>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t bg-muted/10 flex justify-end gap-3 px-8 shrink-0">
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