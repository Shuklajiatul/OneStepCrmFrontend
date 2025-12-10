"use client"

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// The old Pagination component is no longer used, but the import remains for now
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
// Import Tooltip components
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Eye, Copy, BarChart3, Calendar, Users, ExternalLink, Loader2, Edit, Trash2, RotateCcw, Search, ArrowUpDown, Archive, ArchiveRestore, LayoutGrid, List, Table as TableIcon, Database } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import EditFormDialog from "../component/EditForm/edit-form"
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
import { v4 as uuidv4 } from 'uuid'
import { authUtils } from '@/lib/auth-utils'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from "@/lib/utils"

const FALLBACK_USER_ID = process.env.NEXT_PUBLIC_USER_ID;

export default function MyFormsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const isStandaloneRoute = pathname === '/my-forms'

  const tokens = authUtils.getTokens()
  const storedUserId =
    tokens?.user?.user_id ||
    tokens?.user?.id ||
    tokens?.user_id ||
    tokens?.userId ||
    null
  const resolvedUserId = storedUserId || FALLBACK_USER_ID


  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingForm, setEditingForm] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archivingForm, setArchivingForm] = useState(null)
  const [deletingForm, setDeletingForm] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState(null)

  // Search, filter, sort, and pagination states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortField, setSortField] = useState("form_name")
  const [sortDirection, setSortDirection] = useState("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // View mode state
  const [viewMode, setViewMode] = useState("table")

  useEffect(() => {
    fetchForms()
  }, [])

  // Helper function to generate unique field IDs
  const generateUniqueFieldId = (prefix = 'field') => {
    return uuidv4()
  }

  // Function to parse the character-by-character field data
  const parseFieldData = (field) => {
    try {
      // Case 1: Field is an object with numeric keys (character-by-character JSON)
      if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
        const keys = Object.keys(field).filter(key => !isNaN(key))

        if (keys.length > 0) {
          try {
            // Reconstruct the JSON string by sorting numeric keys and joining characters
            const jsonString = keys
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => field[key])
              .join('')

            if (jsonString.trim()) {
              return JSON.parse(jsonString)
            }
          } catch (parseError) {
            console.error('Failed to parse reconstructed JSON:', parseError)
          }
        }
      }

      // Case 2: Field is a JSON string
      if (typeof field === 'string') {
        try {
          return JSON.parse(field)
        } catch (parseError) {
          console.warn('Failed to parse field as JSON string:', field)
        }
      }

      // Case 3: Field is already a proper object
      if (typeof field === 'object' && field !== null) {
        // Parse options and validation if they are strings
        const parsedField = { ...field }

        // Parse options
        if (typeof parsedField.options === 'string') {
          try {
            parsedField.options = JSON.parse(parsedField.options)
          } catch (e) {
            // If JSON parsing fails, try comma-separated
            parsedField.options = parsedField.options.split(',').map(opt => opt.trim()).filter(opt => opt)
          }
        }

        // Parse validation - check both 'validation' and 'validations' fields
        if (typeof parsedField.validation === 'string') {
          try {
            parsedField.validation = JSON.parse(parsedField.validation)
          } catch (e) {
            parsedField.validation = {}
          }
        } else if (typeof parsedField.validations === 'string') {
          try {
            parsedField.validation = JSON.parse(parsedField.validations)
          } catch (e) {
            parsedField.validation = {}
          }
        } else if (typeof parsedField.validations === 'object') {
          // If validations is already an object, use it as validation
          parsedField.validation = parsedField.validations
        }

        return parsedField
      }

      // Default fallback
      return {
        id: 'unknown-field',
        type: 'text',
        label: 'Unknown Field',
        required: false,
        options: [],
        validation: {}
      }

    } catch (error) {
      console.error('Error parsing field data:', error)
      return {
        id: 'error-field',
        type: 'text',
        label: 'Error Parsing Field',
        required: false,
        options: [],
        validation: {}
      }
    }
  }

  // Function to count the number of fields in a form
  const countFormFields = (form) => {
    if (!form.fields || !Array.isArray(form.fields)) return 0

    let fieldCount = 0

    form.fields.forEach((field) => {
      // Direct field object (after update)
      if (field && typeof field === 'object' && field.name && field.type) {
        fieldCount++
      }
      // Character-by-character format (new forms)
      else if (field && typeof field === 'object') {
        const keys = Object.keys(field).filter(key => !isNaN(key))
        if (keys.length > 0) {
          fieldCount++ // Count as one field even if we can't parse it
        }
      }
    })

    return fieldCount
  }

  // Function to get form details for editing
  const getFormDetails = async (formId) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/forms/${process.env.NEXT_PUBLIC_ORGANIZATION_ID}/${process.env.NEXT_PUBLIC_TABLE_ID}/${formId}`,
        {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      )
      const result = response.data

      if (result.success && result.data) {
        return result.data
      } else {
        throw new Error('Form not found in response')
      }
    } catch (error) {
      console.error('Error fetching form details:', error)
      toast.error(`Failed to fetch form details: ${error.message}`)
      throw error
    }
  }

  // Function to update form
  const updateForm = async (formData) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/forms/update`, formData, {
        headers: {
          'Authorization': authUtils.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      })
      const result = response.data

      if (result.success) {
        return result
      } else {
        throw new Error('Update failed: ' + (result.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating form:', error)
      toast.error(`Failed to update form: ${error.message}`)
      throw error
    }
  }

  // Function to archive/unarchive form - UPDATED
  const toggleArchiveForm = async (formId, currentStatus, version) => {
    try {
      const form = forms.find(f => f.form_id === formId && (f.version || 1) === version)
      
      if (form?.hasNewerVersion && currentStatus) {
        toast.error("Cannot unarchive: A newer version exists")
        return
      }

      setArchivingForm(formId)

      const archivePayload = {
        organization_id: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
        form_id: formId,
        table_id: process.env.NEXT_PUBLIC_TABLE_ID,
        status: !currentStatus,
        version: version || 1
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/forms/archieve`,
        archivePayload,
        {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      )

      const result = response.data

      if (result.success) {
        const newArchiveStatus = result.archieve_status
        const targetVersion = version || 1
        
        setForms(prevForms => {
          const updatedForms = prevForms.map(f => {
            const fVersion = f.version || 1
            if (f.form_id === formId && Number(fVersion) === Number(targetVersion)) {
              return {
                ...f,
                archived: newArchiveStatus,
                isarchieved: newArchiveStatus
              }
            }
            return f
          })
          return updatedForms
        })

        const action = newArchiveStatus ? "archived" : "unarchived"
        const formName = forms.find(f => f.form_id === formId)?.form_name || "Form"
        toast.success(`Form "${formName}" v-${targetVersion} ${action} successfully!`)
      } else {
        throw new Error(result.message || 'Failed to update form status')
      }
    } catch (error) {
      console.error('Error toggling archive status:', error)
      toast.error(`Failed to update form: ${error.message}`)
    } finally {
      setArchivingForm(null)
    }
  }

  // Function to delete form
  const deleteForm = async (form) => {
    try {
      console.log('Starting delete for form:', {
        form_id: form.form_id,
        form_name: form.form_name,
        version: form.version || 1
      })
      setDeletingForm(form.form_id)

      const deletePayload = {
        organization_id: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
        form_id: form.form_id,
        table_id: process.env.NEXT_PUBLIC_TABLE_ID,
        version: form.version || 1
      }

      console.log('Delete payload:', deletePayload)

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/forms/delete`,
        deletePayload,
        {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      )

      const result = response.data
      console.log('Delete response:', result)

      if (result.success) {
        // Remove the specific form version from local state
        setForms(prevForms => {
          const filteredForms = prevForms.filter(f =>
            !(f.form_id === form.form_id && (f.version || 1) === (form.version || 1))
          )
          console.log(`Removed version ${form.version || 1} of form ${form.form_id}. Remaining forms:`, filteredForms.length)
          return filteredForms
        })

        toast.success(`Form "${form.form_name}" v-${form.version || 1} deleted successfully!`)
        // Close dialog and reset state
        setDeleteDialogOpen(false)
        setFormToDelete(null)
      } else {
        throw new Error(result.message || 'Failed to delete form')
      }
    } catch (error) {
      console.error('Error deleting form:', error)
      toast.error(`Failed to delete form: ${error.message}`)
    } finally {
      // Only reset deletingForm state, don't close dialog on error
      setDeletingForm(null)
    }
  }

  // Function to confirm delete
  const confirmDelete = (form) => {
    setFormToDelete(form)
    setDeleteDialogOpen(true)
  }

  const fetchForms = async () => {
    try {
      setLoading(true)

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/forms/all/${process.env.NEXT_PUBLIC_ORGANIZATION_ID}/${process.env.NEXT_PUBLIC_TABLE_ID}`,
        {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      )
      const result = response.data
      console.log('API Forms Response:', result)

      if (result.success && Array.isArray(result.data)) {
        // Group forms by form_id to find latest versions
        const formGroups = {}
        result.data.forEach(form => {
          const formId = form.form_id || form.id
          if (!formGroups[formId]) formGroups[formId] = []
          formGroups[formId].push(form)
        })

        // Process the forms to add field counts and format dates
        const processedForms = result.data.map(form => {
          const formId = form.form_id || form.id
          const currentVersion = form.version || 1
          const latestVersion = Math.max(...formGroups[formId].map(f => f.version || 1))
          const hasNewerVersion = currentVersion < latestVersion

          return {
            ...form,
            fieldCount: countFormFields(form),
            created: form.created_at ? new Date(form.created_at).toLocaleDateString() : 'Unknown',
            createdDate: form.created_at ? new Date(form.created_at) : new Date(),
            form_id: formId,
            archived: form.archived === true || form.archived === 'true' ||
              form.archieve_status === true || form.archieve_status === 'true' ||
              form.isarchieved === true || form.isarchieved === 'true' || hasNewerVersion,
            isarchieved: form.isarchieved === true || form.isarchieved === 'true' ||
              form.archived === true || form.archived === 'true' ||
              form.archieve_status === true || form.archieve_status === 'true' || hasNewerVersion,
            hasNewerVersion
          }
        })

        setForms(processedForms)
      } else {
        throw new Error('Invalid response format from server')
      }

    } catch (error) {
      console.error('Error fetching forms:', error)
      toast.error(`Failed to load forms: ${error.message}`)

      // Fallback to empty array
      setForms([])
    } finally {
      setLoading(false)
    }
  }

  const copyFormLink = async (form) => {
    if (form.archived) {
      toast.error("Cannot copy link: Form is archived")
      return
    }

    const link = `${window.location.origin}/forms/${form.form_id}?user_id=${resolvedUserId}&version=${form.version || 1}`

    try {
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link)
        toast.success("Form link copied to clipboard!")
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea')
        textArea.value = link
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          const successful = document.execCommand('copy')
          if (successful) {
            toast.success("Form link copied to clipboard!")
          } else {
            toast.error("Failed to copy link. Please copy manually.")
          }
        } catch (err) {
          console.error('Fallback copy failed:', err)
          toast.error("Failed to copy link. Please copy manually.")
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err)
      toast.error("Failed to copy link. Please copy manually.")
    }
  }

  const openFormInNewTab = async (form) => {
    if (form.archived) {
      toast.error("Cannot open form: Form is archived")
      return
    }

    try {
      // Fetch the latest version of the form
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/forms/${process.env.NEXT_PUBLIC_ORGANIZATION_ID}/${process.env.NEXT_PUBLIC_TABLE_ID}/${form.form_id}`,
        {
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      )

      const result = response.data
      if (result.success && result.form) {
        const latestVersion = result.form.version || 1
        const link = `${window.location.origin}/forms/${form.form_id}?user_id=${resolvedUserId}&version=${latestVersion}`
        window.open(link, '_blank', 'noopener,noreferrer')
        toast.info("Opening form in new tab")
      } else {
        // Fallback to form.version if API call fails
        const link = `${window.location.origin}/forms/${form.form_id}?user_id=${resolvedUserId}&version=${form.version || 1}`
        window.open(link, '_blank', 'noopener,noreferrer')
        toast.info("Opening form in new tab")
      }
    } catch (error) {
      console.error('Error fetching latest form version:', error)
      // Fallback to form.version if API call fails
      const link = `${window.location.origin}/forms/${form.form_id}?user_id=${resolvedUserId}&version=${form.version || 1}`
      window.open(link, '_blank', 'noopener,noreferrer')
      toast.info("Opening form in new tab")
    }
  }

  const handleEditForm = async (formId) => {
    try {
      toast.info("Loading form details...")
      const formDetails = await getFormDetails(formId)

      // Parse the fields for editing
      const parsedFields = formDetails.fields.map(field => {
        const parsedField = parseFieldData(field)

        // Parse validation if it's a string - check both 'validation' and 'validations' fields
        let validation = {}
        if (typeof parsedField.validation === 'string') {
          try {
            validation = JSON.parse(parsedField.validation)
          } catch (e) {
            console.warn('Failed to parse validation:', parsedField.validation)
          }
        } else if (typeof parsedField.validation === 'object') {
          validation = parsedField.validation
        } else if (typeof parsedField.validations === 'string') {
          try {
            validation = JSON.parse(parsedField.validations)
          } catch (e) {
            console.warn('Failed to parse validations:', parsedField.validations)
          }
        } else if (typeof parsedField.validations === 'object') {
          validation = parsedField.validations
        }

        // Recursive function to parse nested fields structure
        const parseNestedFieldsRecursively = (nestedFieldsArray) => {
          if (!Array.isArray(nestedFieldsArray)) return []

          return nestedFieldsArray.map(nestedField => {
            const parsedNestedField = {
              id: nestedField.id,
              name: nestedField.name,
              type: nestedField.type,
              label: nestedField.label,
              placeholder: nestedField.placeholder || '',
              required: false,
              options: [],
              validation: nestedField.validations || nestedField.validation || {},
              nestedFields: {}
            }

            // Parse options if they exist
            if (nestedField.options && Array.isArray(nestedField.options)) {
              parsedNestedField.options = nestedField.options.map(opt => {
                if (typeof opt === 'object' && opt.value) {
                  return {
                    value: opt.value,
                    label: opt.label || opt.value,
                    nestedFields: opt.nestedFields || []
                  }
                }
                return typeof opt === 'string' ? opt : (opt.value || opt.label || 'Option')
              })

              // Parse sub-nested fields from options recursively
              const subNestedFields = {}
              nestedField.options.forEach((subOption, subOptionIndex) => {
                if (typeof subOption === 'object' && subOption.nestedFields && Array.isArray(subOption.nestedFields) && subOption.nestedFields.length > 0) {
                  subNestedFields[subOptionIndex] = parseNestedFieldsRecursively(subOption.nestedFields)
                }
              })
              // Only set nestedFields if there are actual nested fields
              if (Object.keys(subNestedFields).length > 0) {
                parsedNestedField.nestedFields = subNestedFields
              }
            }

            return parsedNestedField
          })
        }

        // Parse options and extract nested fields
        let options = []
        let nestedFields = {}

        // Check if field has nestedFields at field level (for fields added during edit)
        if (parsedField.nestedFields && typeof parsedField.nestedFields === 'object') {
          // Convert object with numeric keys to the expected structure
          Object.keys(parsedField.nestedFields).forEach(key => {
            const nestedArray = parsedField.nestedFields[key]
            if (Array.isArray(nestedArray)) {
              nestedFields[key] = parseNestedFieldsRecursively(nestedArray)
            }
          })
        }

        if (Array.isArray(parsedField.options)) {
          options = parsedField.options
        } else if (typeof parsedField.options === 'string') {
          try {
            const parsedOptions = JSON.parse(parsedField.options)
            if (Array.isArray(parsedOptions)) {
              // Extract options and nested fields from the complex structure
              options = parsedOptions.map((option, optionIndex) => {
                if (typeof option === 'object' && option.value) {
                  // If this option has nested fields, extract them recursively
                  if (option.nestedFields && Array.isArray(option.nestedFields) && option.nestedFields.length > 0) {
                    nestedFields[optionIndex] = parseNestedFieldsRecursively(option.nestedFields)
                  }
                  return {
                    value: option.value,
                    label: option.label || option.value,
                    nestedFields: option.nestedFields || []
                  }
                } else {
                  return typeof option === 'string' ? option : (option.value || option.label || 'Option')
                }
              })
            } else {
              options = parsedOptions
            }
          } catch (e) {
            options = parsedField.options.split(',').map(opt => opt.trim()).filter(opt => opt)
          }
        }

        return {
          id: parsedField.id || parsedField.name || generateUniqueFieldId(),
          name: parsedField.name || parsedField.id || generateUniqueFieldId('name'),
          type: parsedField.type || 'text',
          label: parsedField.label || parsedField.name || 'Field',
          placeholder: parsedField.placeholder || '',
          required: parsedField.required === true || parsedField.required === 'true' || false,
          options: options,
          nestedFields: nestedFields,
          isLeadColumn: parsedField.isLeadColumn === true || parsedField.isLeadColumn === 'true' || parsedField.isleadcolumn === true || parsedField.isleadcolumn === 'true' || false,
          validation: {
            required: parsedField.required === true || parsedField.required === 'true' || false,
            multiple: validation.multiple || false,
            min: validation.min,
            max: validation.max,
            accept: validation.accept,
            pattern: validation.pattern,
            ...validation
          }
        }
      }).filter(field => field.id && field.type)

      // Parse group data and reconstruct group fields with subFields
      let groupFields = []
      if (formDetails.group) {
        let groupData = formDetails.group
        // Parse group if it's a JSON string
        if (typeof groupData === 'string') {
          try {
            groupData = JSON.parse(groupData)
          } catch (e) {
            console.warn('Failed to parse group data:', e)
            groupData = []
          }
        }

        if (Array.isArray(groupData)) {
          groupFields = groupData.map(group => {
            // Check if group.fields contains full field objects or just ID references
            const subFields = []
            if (group.fields && Array.isArray(group.fields)) {
              group.fields.forEach(fieldRef => {
                // Check if fieldRef is a full field object (has type property) or just an ID
                if (typeof fieldRef === 'object' && fieldRef.type) {
                  // It's a full field object - parse it like we do for regular fields
                  const parsedSubField = {
                    id: fieldRef.id,
                    name: fieldRef.name || fieldRef.id,
                    type: fieldRef.type,
                    label: fieldRef.label || fieldRef.name || 'Field',
                    placeholder: fieldRef.placeholder || '',
                    required: fieldRef.required === true || fieldRef.required === 'true' || false,
                    options: [],
                    nestedFields: {},
                    isLeadColumn: fieldRef.isLeadColumn === true || fieldRef.isLeadColumn === 'true' || false,
                    validation: fieldRef.validations || fieldRef.validation || {}
                  }

                  // Parse options if they exist
                  if (fieldRef.options && Array.isArray(fieldRef.options)) {
                    parsedSubField.options = fieldRef.options.map(opt => {
                      if (typeof opt === 'object' && opt.value) {
                        return {
                          value: opt.value,
                          label: opt.label || opt.value,
                          nestedFields: opt.nestedFields || []
                        }
                      }
                      return typeof opt === 'string' ? opt : (opt.value || opt.label || 'Option')
                    })
                  }

                  subFields.push(parsedSubField)
                } else {
                  // It's a field ID reference - find the matching field in parsedFields
                  const fieldId = typeof fieldRef === 'string' ? fieldRef : fieldRef.id
                  const matchingField = parsedFields.find(f => f.id === fieldId || f.name === fieldId)
                  if (matchingField) {
                    subFields.push(matchingField)
                  }
                }
              })
            }

            return {
              id: group.id,
              name: group.name,
              type: 'group',
              label: group.label,
              required: group.required === true || group.required === 'true' || false,
              subFields: subFields
            }
          })

          // Remove fields that are part of groups from the main parsedFields array
          // (only if they were ID references, not full objects stored in group)
          const groupFieldIds = new Set()
          groupData.forEach(group => {
            if (group.fields && Array.isArray(group.fields)) {
              group.fields.forEach(fieldRef => {
                // Only add to removal set if it's an ID reference
                if (typeof fieldRef === 'string') {
                  groupFieldIds.add(fieldRef)
                } else if (fieldRef.id && !fieldRef.type) {
                  // It's an object with just id (reference)
                  groupFieldIds.add(fieldRef.id)
                }
              })
            }
          })

          // Filter out fields that belong to groups (only those that were ID references)
          const fieldsNotInGroups = parsedFields.filter(f =>
            !groupFieldIds.has(f.id) && !groupFieldIds.has(f.name)
          )

          // Combine non-group fields with group fields
          parsedFields.length = 0 // Clear the array
          parsedFields.push(...fieldsNotInGroups, ...groupFields)
        }
      }

      // Clear any existing localStorage data first to ensure fresh start
      localStorage.removeItem('formBuilderData')

      // Store the form data in localStorage to pass to form builder
      const formBuilderData = {
        formId: formDetails.form_id,
        formName: formDetails.form_name,
        description: formDetails.description,
        fields: parsedFields,
        isEditMode: true,
        max_retry_count: formDetails.max_retry_count || formDetails.retry_count || 2
      }

      localStorage.setItem('formBuilderData', JSON.stringify(formBuilderData))

      // Set flag to indicate this is a direct edit action
      sessionStorage.setItem('directEditAction', 'true')

      // Redirect to form builder
      window.location.href = '/custom-form'

    } catch (error) {
      console.error('Error loading form for editing:', error)
      toast.error("Failed to load form for editing")
    }
  }

  const handleUpdateForm = async (updatedData) => {
    try {
      toast.info("Updating form...")

      // Helper function to recursively process nested fields
      const processNestedFieldsForAPI = (nestedFieldsObj) => {
        if (!nestedFieldsObj || typeof nestedFieldsObj !== 'object') return []

        const result = []
        // nestedFieldsObj is structured as { optionIndex: [fields] }
        Object.values(nestedFieldsObj).forEach(fieldsArray => {
          if (Array.isArray(fieldsArray)) {
            fieldsArray.forEach(nestedField => {
              const processedNestedField = {
                id: nestedField.id,
                name: nestedField.name,
                type: nestedField.type,
                label: nestedField.label,
                placeholder: nestedField.placeholder || '',
                required: nestedField.required || false,
                validations: nestedField.validations || nestedField.validation || {},
                hasNested: false,
                isLeadColumn: nestedField.isLeadColumn || false,
                options: []
              }

              // Process options for nested fields
              if ((nestedField.type === 'select' || nestedField.type === 'checkbox' || nestedField.type === 'radio') && nestedField.options) {
                processedNestedField.options = nestedField.options.map((opt, idx) => ({
                  value: typeof opt === 'string' ? opt : opt.value,
                  label: typeof opt === 'string' ? opt : opt.label,
                  nestedFields: nestedField.nestedFields && nestedField.nestedFields[idx]
                    ? processNestedFieldsForAPI({ [idx]: nestedField.nestedFields[idx] })
                    : []
                }))
                processedNestedField.hasNested = processedNestedField.options.some(opt =>
                  opt.nestedFields && opt.nestedFields.length > 0
                )
              }

              result.push(processedNestedField)
            })
          }
        })
        return result
      }

      // Prepare the data for API
      const apiData = {
        form_id: editingForm.form_id,
        table_id: process.env.NEXT_PUBLIC_TABLE_ID,
        organization_id: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
        form_name: updatedData.form_name,
        description: updatedData.description,
        retry_count: updatedData.retry_count || editingForm.retry_count || editingForm.max_retry_count || "2",
        fields: updatedData.fields.map(field => {
          // Process options with nested fields
          let processedOptions = []
          if ((field.type === "select" || field.type === "checkbox" || field.type === "radio") && field.options) {
            processedOptions = (Array.isArray(field.options) ? field.options : []).map((option, optionIndex) => {
              const optionObj = {
                value: typeof option === 'string' ? option : option.value,
                label: typeof option === 'string' ? option : option.label,
                nestedFields: []
              }

              // Check both structures for nested fields
              // 1. Check if option already has nestedFields array (from table columns or option structure)
              if (option.nestedFields && Array.isArray(option.nestedFields)) {
                optionObj.nestedFields = option.nestedFields
              }
              // 2. Check if field has nestedFields[optionIndex] (from form builder)
              else if (field.nestedFields && field.nestedFields[optionIndex]) {
                optionObj.nestedFields = processNestedFieldsForAPI({ [optionIndex]: field.nestedFields[optionIndex] })
              }

              return optionObj
            })
          }

          // Check if field has nested fields
          const hasNested = processedOptions.some(option =>
            option.nestedFields && option.nestedFields.length > 0
          )

          const fieldObj = {
            name: field.name || field.id,
            type: field.type,
            required: field.required ? "true" : "false",
            label: field.label || field.name || 'Field',
            placeholder: field.placeholder || "",
            isLeadColumn: field.isLeadColumn ? "true" : "false",
            hasNested: hasNested
          }

          // Handle options - convert processed options array to JSON string
          if ((field.type === "select" || field.type === "checkbox" || field.type === "radio") && field.options) {
            fieldObj.options = JSON.stringify(processedOptions)
          } else {
            fieldObj.options = "[]"
          }

          // Handle validation - include ALL validation properties
          const validation = {
            multiple: field.validation?.multiple || false,
            required: field.required || false,
            min: field.validation?.min,
            max: field.validation?.max,
            accept: field.validation?.accept,
            pattern: field.validation?.pattern
          }

          // Remove undefined values
          Object.keys(validation).forEach(key => {
            if (validation[key] === undefined) {
              delete validation[key]
            }
          })

          // Use the field's validation object if available
          if (field.validation) {
            fieldObj.validations = JSON.stringify(field.validation)
          } else {
            fieldObj.validations = JSON.stringify(validation)
          }

          return fieldObj
        })
      }

      const result = await updateForm(apiData)

      toast.success("Form updated successfully!")
      setEditDialogOpen(false)
      setEditingForm(null)

      // Refresh the forms list
      fetchForms()

      return result

    } catch (error) {
      console.error('Error updating form:', error)
      toast.error(`Failed to update form: ${error.message}`)
      throw error
    }
  }

  const refreshForms = () => {
    fetchForms()
  }

  // Filter and search functions
  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      const matchesSearch = form.form_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "published" && form.published && !form.archived) ||
        (statusFilter === "draft" && !form.published && !form.archived) ||
        (statusFilter === "archived" && form.archived)

      return matchesSearch && matchesStatus
    })
  }, [forms, searchTerm, statusFilter])

  // Sort functions
  const sortedForms = useMemo(() => {
    return [...filteredForms].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Handle date sorting
      if (sortField === "createdDate") {
        aValue = a.createdDate
        bValue = b.createdDate
      }

      // Handle numeric sorting for fieldCount
      if (sortField === "fieldCount") {
        aValue = a.fieldCount || 0
        bValue = b.fieldCount || 0
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredForms, sortField, sortDirection])

  // Pagination calculations
  const totalPages = Math.ceil(sortedForms.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedForms = sortedForms.slice(startIndex, startIndex + itemsPerPage)

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Main content
  const mainContent = (
    <TooltipProvider delayDuration={0}>
      <div className="container mx-auto py-1 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Database className="h-6 w-6" />
                  Forms Management
                </CardTitle>
                <CardDescription>
                  Manage and view all your created forms
                </CardDescription>
              </div>
              {/* <Button onClick={refreshForms} variant="outline" disabled={loading}>
                <RotateCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button> */}
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-between items-center">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search forms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>

              {/* Group for right-side controls */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Selector */}
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "table" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("table")}
                      >
                        <TableIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Table View</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>List View</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "card" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("card")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Card View</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Clear Filters Button */}
                {(statusFilter !== "all" || searchTerm) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                    }}
                    className="whitespace-nowrap"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Forms Content */}
            {forms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No forms found</p>
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No matching forms found</p>
                <Button
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                  }}
                  variant="outline"
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Table View */}
                {viewMode === "table" && (
                  <div className="rounded-md border overflow-hidden w-full">
                    <div className="overflow-x-auto w-full">
                      <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                        <Table className="w-full table-auto">
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead
                                className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                                onClick={() => handleSort("form_name")}
                              >
                                <div className="flex items-center gap-1">
                                  Form Name
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold text-foreground hidden md:table-cell">Description</TableHead>
                              <TableHead
                                className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                                onClick={() => handleSort("fieldCount")}
                              >
                                <div className="flex items-center gap-1">
                                  Fields
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                                onClick={() => handleSort("createdDate")}
                              >
                                <div className="flex items-center gap-1">
                                  Created
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold text-foreground whitespace-nowrap">Status</TableHead>
                              <TableHead className="w-[200px] whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedForms.map((form) => (
                              <TableRow
                                key={`${form.form_id}-v${form.version || 1}`}
                                className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                              >
                                <TableCell className="py-4">
                                  <div>
                                    <span className="font-medium text-primary truncate text-sm md:text-base transition-colors">
                                      {form.form_name} v-{form.version || 1}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 hidden md:table-cell">
                                  <div className="truncate" title={form.description || 'No description'}>
                                    {form.description || 'No description'}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    {form.fieldCount || 0} fields
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {form.created}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      variant={
                                        form.archived ? "destructive" :
                                          form.published ? "default" : "secondary"
                                      }
                                      className="w-fit"
                                    >
                                      {form.archived ? "Archived" : form.published ? "Published" : "Draft"}
                                    </Badge>
                                    {form.archived && (
                                      <span className="text-xs text-muted-foreground hidden sm:block">
                                        Inactive - Users cannot access
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="w-[200px] whitespace-nowrap text-right py-4">
                                  <div className="flex items-center justify-end space-x-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditForm(form.form_id)}
                                          disabled={form.archived}
                                          className="h-8 w-8"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit form</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => copyFormLink(form)}
                                          disabled={form.archived}
                                          className="h-8 w-8"
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{form.archived ? "Form archived - cannot copy link" : `Copy form link (v-${form.version || 1})`}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openFormInNewTab(form)}
                                          disabled={form.archived}
                                          className="h-8 w-8"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{form.archived ? "Form archived - cannot open" : `Open form in new tab (v-${form.version || 1})`}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => router.push(`/form-submissions/${form.form_id}`)}
                                          disabled={form.archived}
                                          className="h-8 w-8"
                                        >
                                          <Database className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View form submissions</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant={form.archived ? "default" : "outline"}
                                          size="icon"
                                          onClick={() => toggleArchiveForm(form.form_id, form.archived, form.version)}
                                          disabled={archivingForm === form.form_id || (form.archived && form.hasNewerVersion)}
                                          className="h-8 w-8"
                                        >
                                          {archivingForm === form.form_id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : form.archived ? (
                                            <ArchiveRestore className="h-4 w-4" />
                                          ) : (
                                            <Archive className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{form.hasNewerVersion && form.archived ? "Cannot unarchive - newer version exists" : form.archived ? "Unarchive form" : "Archive form"}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          onClick={() => confirmDelete(form)}
                                          disabled={deletingForm === form.form_id}
                                          className="h-8 w-8"
                                        >
                                          {deletingForm === form.form_id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete form</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                  <div className="space-y-3">
                    {paginatedForms.map((form) => (
                      <div
                        key={`${form.form_id}-v${form.version || 1}`}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="font-semibold text-base sm:text-lg truncate">{form.form_name}</h3>
                              <Badge variant="outline" className="whitespace-nowrap">v-{form.version || 1}</Badge>
                              <Badge
                                variant={
                                  form.archived ? "destructive" :
                                    form.published ? "default" : "secondary"
                                }
                                className="whitespace-nowrap"
                              >
                                {form.archived ? "Archived" : form.published ? "Published" : "Draft"}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground mb-2 text-sm sm:text-base">
                              {form.description || 'No description'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                {form.fieldCount || 0} fields
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {form.created}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditForm(form.form_id)}
                                  disabled={form.archived}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit form</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyFormLink(form)}
                                  disabled={form.archived}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{form.archived ? "Form archived - cannot copy link" : `Copy form link (v-${form.version || 1})`}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openFormInNewTab(form)}
                                  disabled={form.archived}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{form.archived ? "Form archived - cannot open" : `Open form in new tab (v-${form.version || 1})`}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(`/form-submissions/${form.form_id}`)}
                                  disabled={form.archived}
                                >
                                  <Database className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View form submissions</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={form.archived ? "default" : "outline"}
                                  onClick={() => toggleArchiveForm(form.form_id, form.archived, form.version)}
                                  disabled={archivingForm === form.form_id || (form.archived && form.hasNewerVersion)}
                                >
                                  {archivingForm === form.form_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : form.archived ? (
                                    <ArchiveRestore className="h-4 w-4" />
                                  ) : (
                                    <Archive className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{form.hasNewerVersion && form.archived ? "Cannot unarchive - newer version exists" : form.archived ? "Unarchive form" : "Archive form"}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => confirmDelete(form)}
                                  disabled={deletingForm === form.form_id}
                                >
                                  {deletingForm === form.form_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete form</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Card View */}
                {viewMode === "card" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedForms.map((form) => (
                      <Card key={`${form.form_id}-v${form.version || 1}`} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <CardTitle className="text-base sm:text-lg leading-tight truncate flex-1">{form.form_name}</CardTitle>
                            <Badge
                              variant={
                                form.archived ? "destructive" :
                                  form.published ? "default" : "secondary"
                              }
                              className="whitespace-nowrap shrink-0"
                            >
                              {form.archived ? "Archived" : form.published ? "Published" : "Draft"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="whitespace-nowrap">v-{form.version || 1}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {form.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              {form.fieldCount || 0} fields
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {form.created}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditForm(form.form_id)}
                                  disabled={form.archived}
                                  className="flex-1"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit form</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyFormLink(form)}
                                  disabled={form.archived}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{form.archived ? "Form archived - cannot copy link" : `Copy form link (v-${form.version || 1})`}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openFormInNewTab(form)}
                                  disabled={form.archived}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{form.archived ? "Form archived - cannot open" : `Open form in new tab (v-${form.version || 1})`}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(`/form-submissions/${form.form_id}`)}
                                  disabled={form.archived}
                                >
                                  <Database className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View form submissions</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={form.archived ? "default" : "outline"}
                                  onClick={() => toggleArchiveForm(form.form_id, form.archived, form.version)}
                                  disabled={archivingForm === form.form_id || (form.archived && form.hasNewerVersion)}
                                >
                                  {archivingForm === form.form_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : form.archived ? (
                                    <ArchiveRestore className="h-4 w-4" />
                                  ) : (
                                    <Archive className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{form.hasNewerVersion && form.archived ? "Cannot unarchive - newer version exists" : form.archived ? "Unarchive form" : "Archive form"}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => confirmDelete(form)}
                                  disabled={deletingForm === form.form_id}
                                >
                                  {deletingForm === form.form_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete form</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {sortedForms.length > 0 && (
                  <div className="mt-6 px-4 sm:px-0 pb-4 sm:pb-0">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        {/* Items per page selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Show</span>
                          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
                        </div>

                        {/* Page info */}
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedForms.length)} of {sortedForms.length} forms
                        </div>
                      </div>

                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>

                            {/* Show limited page numbers for better UX */}
                            {(() => {
                              const pages = [];
                              const maxVisiblePages = 5;
                              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                              // Adjust start page if we're near the end
                              if (endPage - startPage + 1 < maxVisiblePages) {
                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                              }

                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <PaginationItem key={i}>
                                    <PaginationLink
                                      onClick={() => setCurrentPage(i)}
                                      isActive={currentPage === i}
                                      className="cursor-pointer"
                                    >
                                      {i}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              }
                              return pages;
                            })()}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Form Dialog */}
        <EditFormDialog
          form={editingForm}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleUpdateForm}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this form?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the form &quot;
                <span className="font-semibold">{formToDelete?.form_name}</span>&quot; and all of its data.
                {formToDelete?.published && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    ⚠️ This form is currently published. Deleting it will make it inaccessible to users.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingForm === formToDelete?.form_id}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteForm(formToDelete)}
                disabled={deletingForm === formToDelete?.form_id}
                className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingForm === formToDelete?.form_id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete Form'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )

  // If not standalone route (used within main page), return just the content
  return mainContent

}