"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { FieldPalette } from "../component/formbuilder/field-palette"
import { FormCanvas } from "../component/formbuilder/form-canvas"
import { FieldConfigPanel } from "../component/formbuilder/field-config-panel"
import { FormPreview } from "../component/formbuilder/form-preview"
import { ResizableDivider } from "../component/formbuilder/resizable-divider"
import MyFormsPage from "../my-forms/page"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Code, Settings, FileText, Download, Plus, GripVertical, Trash2, AlertTriangle, ArrowLeft, X, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { v4 as uuidv4 } from 'uuid'

export default function CustomFormPage() {
  const router = useRouter()
  const [fields, setFields] = useState([])
  const [selectedField, setSelectedField] = useState(null)
  const [activeTab, setActiveTab] = useState("builder")
  const [fieldPaletteCollapsed, setFieldPaletteCollapsed] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState(null)
  const [showMyForms, setShowMyForms] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Resizable panel widths
  const [paletteWidth, setPaletteWidth] = useState(256) // 256px = w-64
  const [configPanelWidth, setConfigPanelWidth] = useState(400) // ~33% of typical screen

  // Memoized resize handlers
  const handlePaletteResize = useCallback((width) => {
    setPaletteWidth(width)
  }, [])

  const handleConfigPanelResize = useCallback((width) => {
    setConfigPanelWidth(width)
  }, [])

  // Ensure client-side rendering to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
    
    // Load saved panel widths from localStorage
    const savedPaletteWidth = localStorage.getItem('formbuilder-palette-width')
    const savedConfigWidth = localStorage.getItem('formbuilder-config-width')
    
    if (savedPaletteWidth) {
      setPaletteWidth(parseInt(savedPaletteWidth, 10))
    }
    if (savedConfigWidth) {
      setConfigPanelWidth(parseInt(savedConfigWidth, 10))
    }
  }, [])

  // Save panel widths to localStorage when they change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('formbuilder-palette-width', paletteWidth.toString())
    }
  }, [paletteWidth, isClient])

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('formbuilder-config-width', configPanelWidth.toString())
    }
  }, [configPanelWidth, isClient])

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only clear if not in edit mode (to preserve edit data on refresh)
      if (!isEditMode) {
        sessionStorage.removeItem('directEditAction')
        sessionStorage.removeItem('wasEditingForm')
      }
      // Don't clear localStorage in edit mode to preserve data on refresh
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditMode])

  // Check for edit mode data from localStorage first
  useEffect(() => {
    // Check if we're coming from a direct edit action (not browser back)
    const isDirectEdit = sessionStorage.getItem('directEditAction')
    const formBuilderData = localStorage.getItem('formBuilderData')
    const wasEditingFlag = sessionStorage.getItem('wasEditingForm')

    // Load edit data if:
    // 1. We have formBuilderData AND it's a direct edit action, OR
    // 2. We have formBuilderData AND wasEditingFlag exists (for refresh scenarios)
    if (formBuilderData) {
      try {
        const data = JSON.parse(formBuilderData)
        if (data.isEditMode && (isDirectEdit || wasEditingFlag)) {
          // Process nested fields from options to field.nestedFields structure
          const processedFields = data.fields.map(field => {
            if (['select', 'checkbox', 'radio'].includes(field.type) && field.options && Array.isArray(field.options)) {
              const nestedFields = {}

              // Recursive function to extract nested fields from any level
              const extractNestedFieldsRecursively = (nestedFieldsArray) => {
                return nestedFieldsArray.map(nestedField => {
                  const processedNestedField = {
                    id: nestedField.id,
                    name: nestedField.name,
                    type: nestedField.type,
                    label: nestedField.label,
                    placeholder: nestedField.placeholder || '',
                    required: nestedField.required === true || nestedField.required === 'true' || false,
                    options: [],
                    validation: nestedField.validations || {},
                    nestedFields: {}
                  }

                  // Process options if they exist
                  if (nestedField.options && Array.isArray(nestedField.options)) {
                    processedNestedField.options = nestedField.options.map(opt => {
                      if (typeof opt === 'object' && opt.value) {
                        return {
                          value: opt.value,
                          label: opt.label || opt.value,
                          nestedFields: opt.nestedFields || []
                        }
                      }
                      return typeof opt === 'string' ? opt : (opt.value || opt.label || 'Option')
                    })

                    // Process sub-nested fields from options recursively
                    const subNestedFields = {}
                    nestedField.options.forEach((subOption, subOptionIndex) => {
                      if (typeof subOption === 'object' && subOption.nestedFields && Array.isArray(subOption.nestedFields) && subOption.nestedFields.length > 0) {
                        subNestedFields[subOptionIndex] = extractNestedFieldsRecursively(subOption.nestedFields)
                      }
                    })

                    // Only set nestedFields if there are actual nested fields
                    if (Object.keys(subNestedFields).length > 0) {
                      processedNestedField.nestedFields = subNestedFields
                    }
                  }

                  return processedNestedField
                })
              }

              // Only process options for field types that have options (select, checkbox, radio)
              if (field.options && Array.isArray(field.options)) {
                field.options.forEach((option, optionIndex) => {
                if (typeof option === 'object' && option.nestedFields && Array.isArray(option.nestedFields) && option.nestedFields.length > 0) {
                  nestedFields[optionIndex] = extractNestedFieldsRecursively(option.nestedFields)
                }
                })
              }

              return {
                ...field,
                nestedFields: nestedFields,
                // Also preserve the original options structure for the field renderer
                options: field.options.map(option => ({
                  ...option,
                  nestedFields: option.nestedFields || []
                }))
              }
            }
            return field
          })

          // Ensure all field IDs are unique before setting fields
          const fieldsWithUniqueIds = ensureUniqueFieldIds(processedFields)

          setFields(fieldsWithUniqueIds)
          setIsEditMode(true)
          setEditFormData(data)

          // Don't clear localStorage - keep it for persistence across refreshes
          // localStorage.removeItem('formBuilderData')
        }
      } catch (error) {
        console.error('Error parsing form builder data:', error)
        localStorage.removeItem('formBuilderData')
        sessionStorage.removeItem('directEditAction')
        sessionStorage.removeItem('wasEditingForm')
      }
    } else {
      // No directEditAction flag - this means browser back or fresh page load
      if (formBuilderData) {
        try {
          const data = JSON.parse(formBuilderData)
          // If it's edit mode data but no directEditAction flag, clear it (browser back scenario)
          if (data.isEditMode) {
            localStorage.removeItem('formBuilderData')
          } else {
            localStorage.removeItem('formBuilderData')
          }
        } catch (error) {
          console.error('Error parsing formBuilderData:', error)
          localStorage.removeItem('formBuilderData')
        }
      }

      // Only restore from sessionStorage if not in edit mode
      const savedFields = sessionStorage.getItem('form-preview-fields')
      if (savedFields) {
        try {
          const parsedFields = JSON.parse(savedFields)
          if (parsedFields.length > 0) {
            // Ensure all field IDs are unique before setting fields
            const fieldsWithUniqueIds = ensureUniqueFieldIds(parsedFields)
            setFields(fieldsWithUniqueIds)
          }
        } catch (error) {
          console.error('Error restoring fields:', error)
        }
      }
    }
  }, [])

  // Handle navigation back from preview - don't reload fields if they're already loaded
  useEffect(() => {
    const intendedTab = sessionStorage.getItem('intended-tab')
    if (intendedTab === 'custom-form' && isEditMode && fields.length > 0) {
      // Fields are already loaded from localStorage persistence, just clear the intended tab
      sessionStorage.removeItem('intended-tab')
    }
  }, [isEditMode, fields.length])

  // Save fields to sessionStorage whenever they change (only if not in edit mode)
  useEffect(() => {
    if (!isEditMode && fields.length > 0) {
      sessionStorage.setItem('form-preview-fields', JSON.stringify(fields))
    }
  }, [fields, isEditMode])

  // Save fields to localStorage when in edit mode (for persistence across refreshes)
  useEffect(() => {
    if (isEditMode && editFormData && fields.length > 0) {
      const formBuilderData = {
        ...editFormData,
        fields: fields
      }
      localStorage.setItem('formBuilderData', JSON.stringify(formBuilderData))

      // Dispatch custom event to notify preview page of changes
      window.dispatchEvent(new CustomEvent('formBuilderDataUpdated'))
    }
  }, [fields, isEditMode, editFormData])

  // Additional effect to save fields immediately after any field update in edit mode
  useEffect(() => {
    if (isEditMode && editFormData && fields.length > 0) {
      // Use a timeout to ensure the state has been updated
      const timeoutId = setTimeout(() => {
        const formBuilderData = {
          ...editFormData,
          fields: fields
        }
        localStorage.setItem('formBuilderData', JSON.stringify(formBuilderData))

        // Dispatch custom event to notify preview page of changes
        window.dispatchEvent(new CustomEvent('formBuilderDataUpdated'))
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [fields])

  // Cleanup localStorage when component unmounts (only if not in edit mode)
  useEffect(() => {
    return () => {
      // Only cleanup if we're not in edit mode to avoid clearing data during refresh
      if (!isEditMode) {
        localStorage.removeItem('formBuilderData')
      }
    }
  }, [isEditMode])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Helper function to map data types
  const mapDataTypeToFieldType = (dataType) => {
    const typeMap = {
      'text': 'text',
      'varchar': 'text',
      'string': 'text',
      'email': 'email',
      'number': 'number',
      'integer': 'number',
      'float': 'number',
      'decimal': 'number',
      'dropdown': 'select',
      'dropDown': 'select',
      'select': 'select',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'textarea': 'textarea',
      'file': 'file',
      'datetime': 'datetime',
      'date': 'datetime',
      'phone': 'phone',
      'location': 'location'
    }
    return typeMap[dataType?.toLowerCase()] || 'text'
  }

  // Helper function to generate unique field IDs
  const generateUniqueFieldId = (prefix = 'field') => {
    return uuidv4()
  }

  // Helper function to ensure field IDs are unique
  // const ensureUniqueFieldIds = (fields) => {
  //   const existingIds = new Set(fields.map(f => f.id))
  //   return fields.map(field => {
  //     if (existingIds.has(field.id)) {
  //       const newId = generateUniqueFieldId()
  //       existingIds.add(newId)
  //       return { ...field, id: newId }
  //     }
  //     existingIds.add(field.id)
  //     return field
  //   })
  // }

  const ensureUniqueFieldIds = (fields) => {
    const seenIds = new Set()
    return fields.map(field => {
      // Only generate new ID if this ID has already been seen (duplicate)
      if (seenIds.has(field.id)) {
        const newId = generateUniqueFieldId()
        seenIds.add(newId)
        console.log(`⚠️ Duplicate field ID detected: ${field.id}, generating new ID: ${newId}`)
        return { ...field, id: newId }
      }
      // First time seeing this ID - keep it and add to seen set
      seenIds.add(field.id)
      return field
    })
  }

  const addField = useCallback((type, predefinedFields = null) => {
    if (predefinedFields) {
      // Handle predefined fields (like from table columns)
      if (Array.isArray(predefinedFields)) {
        // Multiple fields - ensure all IDs are unique
        const fieldsWithUniqueIds = ensureUniqueFieldIds(predefinedFields)
        setFields(prev => {
          const newFields = [...prev, ...fieldsWithUniqueIds]
          
          // Immediately save to localStorage if in edit mode
          if (isEditMode && editFormData) {
            const formBuilderData = {
              ...editFormData,
              fields: newFields
            }
            localStorage.setItem('formBuilderData', JSON.stringify(formBuilderData))
            window.dispatchEvent(new CustomEvent('formBuilderDataUpdated'))
          }
          
          return newFields
        })
        if (fieldsWithUniqueIds.length > 0) {
          setSelectedField(fieldsWithUniqueIds[0])
        }
      } else {
        // Single field - ensure ID is unique
        const fieldWithUniqueId = ensureUniqueFieldIds([predefinedFields])[0]
        setFields(prev => {
          const newFields = [...prev, fieldWithUniqueId]
          
          // Immediately save to localStorage if in edit mode
          if (isEditMode && editFormData) {
            const formBuilderData = {
              ...editFormData,
              fields: newFields
            }
            localStorage.setItem('formBuilderData', JSON.stringify(formBuilderData))
            window.dispatchEvent(new CustomEvent('formBuilderDataUpdated'))
          }
          
          return newFields
        })
        setSelectedField(fieldWithUniqueId)
      }
    } else if (type === "table_column") {
      // Add table column selector field
      const newField = {
        id: generateUniqueFieldId('table-column'),
        type: "table_column",
        label: "Table Columns",
        description: "Select columns from your table to use as form fields",
        placeholder: "",
        required: false,
        nestedFields: {},
        onAddTableColumns: (newFields) => {
          if (Array.isArray(newFields) && newFields.length > 0) {
            // Ensure all field IDs are unique before adding
            const fieldsWithUniqueIds = ensureUniqueFieldIds(newFields)
            setFields(prev => {
              const updatedFields = [...prev, ...fieldsWithUniqueIds]
              
              // Immediately save to localStorage if in edit mode
              if (isEditMode && editFormData) {
                const formBuilderData = {
                  ...editFormData,
                fields: updatedFields
              }
              localStorage.setItem('formBuilderData', JSON.stringify(formBuilderData))
              window.dispatchEvent(new CustomEvent('formBuilderDataUpdated'))
              }
              
              return updatedFields
            })
            setSelectedField(fieldsWithUniqueIds[0])
          } else {
            console.error('❌ No fields to add or invalid format')
          }
        }
      }
      setFields(prev => [...prev, newField])
      setSelectedField(newField)
    } else {
      // Regular field creation
      const newField = {
        id: generateUniqueFieldId(),
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1) + " Field",
        placeholder: "",
        required: false,
        options: ["select", "checkbox", "radio"].includes(type) ? ["Option 1", "Option 2", "Option 3"] : undefined,
        validation: {},
        nestedFields: {},
      }
      setFields(prev => {
        const newFields = [...prev, newField]
        
        // Immediately save to localStorage if in edit mode
        if (isEditMode && editFormData) {
          const formBuilderData = {
            ...editFormData,
              fields: newFields
            }
            localStorage.setItem('formBuilderData', JSON.stringify(formBuilderData))
            window.dispatchEvent(new CustomEvent('formBuilderDataUpdated'))
        }
        
        return newFields
      })
      setSelectedField(newField)
    }
  }, [])

  const updateField = useCallback((fieldId, updates) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, ...updates }
      }
      return field
    })

    // Force a deep update by creating a new array reference
    setFields([...updatedFields])
    if (selectedField && selectedField.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates })
    }

    // Immediately save to localStorage if in edit mode
    if (isEditMode && editFormData) {
      const formBuilderData = {
        ...editFormData,
        fields: [...updatedFields]
      }
      localStorage.setItem('formBuilderData', JSON.stringify(formBuilderData))

      // Dispatch custom event to notify preview page of changes
      window.dispatchEvent(new CustomEvent('formBuilderDataUpdated'))
    }
  }, [fields, selectedField, isEditMode, editFormData])

  const deleteField = useCallback((fieldId) => {
    const currentFieldIndex = fields.findIndex(field => field.id === fieldId)
    const isSelectedField = selectedField && selectedField.id === fieldId

    setFields(fields.filter(field => field.id !== fieldId))

    if (isSelectedField) {
      // If the deleted field was selected, find another field to select
      const remainingFields = fields.filter(field => field.id !== fieldId)

      if (remainingFields.length > 0) {
        // Select the next field, or the previous one if we deleted the last field
        const nextFieldIndex = currentFieldIndex < remainingFields.length ? currentFieldIndex : currentFieldIndex - 1
        const nextField = remainingFields[nextFieldIndex] || remainingFields[remainingFields.length - 1]

        // Add a small delay for smooth transition
        setTimeout(() => {
          setSelectedField(nextField)
        }, 150)
      } else {
        // No fields left, close the panel
        setTimeout(() => {
          setSelectedField(null)
        }, 150)
      }
    }
  }, [fields, selectedField])

  const moveField = useCallback((fromIndex, toIndex) => {
    setFields(prev => {
      const newFields = [...prev]
      const [movedField] = newFields.splice(fromIndex, 1)
      newFields.splice(toIndex, 0, movedField)
      return newFields
    })
  }, [])

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    if (active.data.current?.type === "field-type") {
      const fieldType = active.data.current.fieldType
      addField(fieldType)
      return
    }

    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [addField])

  const toggleFieldPalette = useCallback(() => {
    setFieldPaletteCollapsed(prev => !prev)
  }, [])

  const handleSaveForm = useCallback(async () => {
    try {
      if (isEditMode && editFormData) {
        // Update existing form

        // TODO: Implement actual update API call
        alert(`Update functionality will be implemented for form: ${editFormData.formName}`)
      } else {
        // Create new form

        // TODO: Implement actual create API call
        alert('Create functionality will be implemented')
      }
    } catch (error) {
      console.error('Error saving form:', error)
    }
  }, [isEditMode, editFormData, fields])

  const handleBackToForms = useCallback(() => {
    // Clear localStorage when leaving edit mode
    localStorage.removeItem('formBuilderData')
    sessionStorage.removeItem('directEditAction')
    sessionStorage.removeItem('wasEditingForm')
    sessionStorage.setItem('intended-tab', 'my-forms')
    router.push('/')
  }, [router])

  const handleTabChange = useCallback((value) => {
    if (value === "preview") {
      // Save the current fields state to localStorage/sessionStorage
      const previewData = {
        fields: fields,
        formName: isEditMode ? editFormData?.formName : 'Custom Form',
        description: isEditMode ? editFormData?.description : '',
        isEditMode: isEditMode,
        formId: isEditMode ? editFormData?.formId : null
      }

      // Use localStorage for better persistence
      localStorage.setItem('form-preview-data', JSON.stringify(previewData))

      // Also save to sessionStorage as backup
      sessionStorage.setItem('form-preview-fields', JSON.stringify(fields))
      sessionStorage.setItem('intended-tab', 'custom-form')

      router.push('/form-preview')
    } else {
      setActiveTab(value)
    }
  }, [fields, isEditMode, editFormData, router])

  const handleClearForm = useCallback(() => {
    setFields([])
    setSelectedField(null)
    sessionStorage.removeItem('form-preview-fields')
    setShowClearDialog(false)
  }, [])

  const regularFieldsCount = useMemo(() => 
    fields.filter(f => f.source !== 'table').length, 
    [fields]
  )
  
  const tableFieldsCount = useMemo(() => 
    fields.filter(f => f.source === 'table').length, 
    [fields]
  )

  // If showMyForms is true, render the MyFormsPage component
  if (showMyForms) {
    return <MyFormsPage />
  }

  return (
    <div className={isEditMode ? "min-h-screen flex flex-col bg-background" : "h-[calc(100vh-140px)] flex flex-col"}>
      {/* Header */}
      {isEditMode ? (
        <div className="p-6 pb-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Edit Form: {editFormData?.formName || 'Untitled'}
              </h1>
              <p className="text-muted-foreground text-base mb-3">
                Edit your form fields and configuration
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {fields.length} total fields
                </Badge>
                {tableFieldsCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {tableFieldsCount} from table
                  </Badge>
                )}
                <Badge variant="destructive" className="text-xs">
                  Edit Mode
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              <Button variant="outline" onClick={handleBackToForms} className="flex items-center gap-2" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Forms
              </Button>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
                <TabsList>
                  <TabsTrigger value="builder" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Builder
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Form Builder</h1>
            <p className="text-muted-foreground">Drag and drop fields to create your custom form</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {fields.length} total fields
              </Badge>
              {tableFieldsCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {tableFieldsCount} from table
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fields.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearDialog(true)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
              <TabsList>
                <TabsTrigger value="builder" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Builder
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All Fields?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all fields? This action cannot be undone and will remove all the fields you've added to the form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearForm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      {!isClient ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading form builder...</p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {isEditMode ? (
            <div className="flex-1 px-6 pb-6 min-h-[600px]">
              <div className="h-[600px] flex border rounded-lg overflow-hidden bg-background">
                {/* Field Palette */}
                <FieldPalette
                  onAddField={addField}
                  collapsed={fieldPaletteCollapsed}
                  onToggleCollapse={toggleFieldPalette}
                  width={paletteWidth}
                />

                {/* Resizable Divider for Palette */}
                {!fieldPaletteCollapsed && (
                  <ResizableDivider
                    onResize={handlePaletteResize}
                    minSize={200}
                    maxSize={500}
                  />
                )}

                {/* Main Canvas */}
                <div className="flex-1 flex min-w-0">
                  <div 
                    className="flex-1 min-w-0 transition-all duration-150 ease-out"
                    style={selectedField ? { width: `calc(100% - ${configPanelWidth}px)` } : {}}
                  >
                    <FormCanvas
                      fields={fields}
                      selectedField={selectedField}
                      onSelectField={setSelectedField}
                      onDeleteField={deleteField}
                      onMoveField={moveField}
                      onAddField={addField}
                      activeId={activeId}
                    />
                  </div>

                  {/* Resizable Divider for Config Panel */}
                  {selectedField && (
                    <ResizableDivider
                      onResize={handleConfigPanelResize}
                      minSize={300}
                      maxSize={700}
                      direction="rtl"
                    />
                  )}

                  {/* Configuration Panel */}
                  {selectedField && (
                    <div 
                      className="border-l bg-card flex-shrink-0 overflow-hidden animate-in slide-in-from-right relative group/config"
                      style={{ 
                        width: `${configPanelWidth}px`,
                        transition: 'width 0.05s ease-out'
                      }}
                    >
                      {/* Modern Close Button on Border */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 -left-3 z-20 h-6 w-6 rounded-full bg-background border border-border shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 ease-out opacity-0 group-hover/config:opacity-100 hover:!opacity-100"
                            onClick={() => setSelectedField(null)}
                            aria-label="Close panel"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" sideOffset={8}>
                          <p>Close panel</p>
                        </TooltipContent>
                      </Tooltip>

                      <FieldConfigPanel
                        field={selectedField}
                        onUpdateField={updateField}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex border rounded-lg overflow-hidden bg-background min-h-0">
              {/* Field Palette */}
              <FieldPalette
                onAddField={addField}
                collapsed={fieldPaletteCollapsed}
                onToggleCollapse={toggleFieldPalette}
                width={paletteWidth}
              />

              {/* Resizable Divider for Palette */}
              {!fieldPaletteCollapsed && (
                <ResizableDivider
                  onResize={handlePaletteResize}
                  minSize={200}
                  maxSize={500}
                />
              )}

              {/* Main Canvas */}
              <div className="flex-1 flex min-w-0">
                <div 
                  className="flex-1 min-w-0 transition-all duration-150 ease-out"
                  style={selectedField ? { width: `calc(100% - ${configPanelWidth}px)` } : {}}
                >
                  <FormCanvas
                    fields={fields}
                    selectedField={selectedField}
                    onSelectField={setSelectedField}
                    onDeleteField={deleteField}
                    onMoveField={moveField}
                    onAddField={addField}
                    activeId={activeId}
                  />
                </div>

                {/* Resizable Divider for Config Panel */}
                {selectedField && (
                  <ResizableDivider
                    onResize={handleConfigPanelResize}
                    minSize={300}
                    maxSize={700}
                    direction="rtl"
                  />
                )}

                {/* Configuration Panel */}
                {selectedField && (
                  <div 
                    className="border-l bg-card flex-shrink-0 overflow-hidden animate-in slide-in-from-right relative group/config"
                    style={{ 
                      width: `${configPanelWidth}px`,
                      transition: 'width 0.05s ease-out'
                    }}
                  >
                    {/* Modern Close Button on Border */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-3 -left-3 z-20 h-6 w-6 rounded-full bg-background border border-border shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 ease-out opacity-0 group-hover/config:opacity-100 hover:!opacity-100"
                          onClick={() => setSelectedField(null)}
                          aria-label="Close panel"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" sideOffset={8}>
                        <p>Close panel</p>
                      </TooltipContent>
                    </Tooltip>

                    <FieldConfigPanel
                      field={selectedField}
                      onUpdateField={updateField}
                      allFields={fields}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DragOverlay>
            {activeId ? (
              <div className="opacity-90 transform rotate-3scale-105 ">
                {activeId.startsWith("field-type-") ? (
                  <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {activeId.replace("field-type-", "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                    <div className="text-sm font-medium">
                      {fields.find(f => f.id === activeId)?.label || "Field"}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}