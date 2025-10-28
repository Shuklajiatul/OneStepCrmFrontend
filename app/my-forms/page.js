"use client"

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Eye, Copy, BarChart3, Calendar, Users, ExternalLink, Loader2, Edit, Trash2, RotateCcw, Search, ArrowUpDown, Archive, ArchiveRestore } from "lucide-react"
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

const USER_ID = process.env.NEXT_PUBLIC_USER_ID;

export default function MyFormsPage() {
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
  const [itemsPerPage, setItemsPerPage] = useState(5)

  useEffect(() => {
    fetchForms()
  }, [])

  // Helper function to generate unique field IDs
  const generateUniqueFieldId = (prefix = 'field') => {
    // Use crypto.randomUUID() if available, otherwise fallback to timestamp + random
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`
    }
    // Fallback: timestamp + high-precision random + counter
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const counter = Math.floor(Math.random() * 10000)
    return `${prefix}-${timestamp}-${random}-${counter}`
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

        // Parse validation
        if (typeof parsedField.validation === 'string') {
          try {
            parsedField.validation = JSON.parse(parsedField.validation)
          } catch (e) {
            parsedField.validation = {}
          }
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
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )
      const result = response.data

      if (result.success && result.form) {
        return result.form
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
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AUTH_TOKEN}`,
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

  // Function to archive/unarchive form
  const toggleArchiveForm = async (formId, currentStatus) => {
    try {
      setArchivingForm(formId)

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/forms/archieve`,
        {
          organization_id: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
          form_id: formId,
          table_id: process.env.NEXT_PUBLIC_TABLE_ID,
          status: !currentStatus // Toggle the status
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const result = response.data
      console.log('Archive API Response:', result)

      if (result.success) {
        // Use the archieve_status from API response to update local state
        const newArchiveStatus = result.archieve_status
        console.log('New archive status:', newArchiveStatus, 'for form:', formId)

        // Update the local state
        setForms(prevForms => {
          const updatedForms = prevForms.map(form =>
            form.form_id === formId
              ? {
                ...form,
                archived: newArchiveStatus,
                isarchieved: newArchiveStatus  // Also update the isarchieved property
              }
              : form
          )
          console.log('Updated forms:', updatedForms.find(f => f.form_id === formId))
          return updatedForms
        })

        const action = newArchiveStatus ? "archived" : "unarchived"
        toast.success(`Form ${action} successfully!`)

        if (newArchiveStatus) {
          toast.info("Form is now inactive. Users cannot access it.")
        } else {
          toast.info("Form is now active. Users can access it.")
        }
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
  const deleteForm = async (formId) => {
    try {
      console.log('Starting delete for form:', formId)
      setDeletingForm(formId)

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/forms/delete`,
        {
          organization_id: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
          form_id: formId,
          table_id: process.env.NEXT_PUBLIC_TABLE_ID
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const result = response.data
      console.log('Delete response:', result)

      if (result.success) {
        // Remove the form from local state
        setForms(prevForms => prevForms.filter(form => form.form_id !== formId))
        toast.success("Form deleted successfully!")
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
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )
      const result = response.data
      console.log('API Forms Response:', result)

      if (result.success && Array.isArray(result.form)) {
        // Process the forms to add field counts and format dates
        const processedForms = result.form.map(form => {

          return {
            ...form,
            // Count the number of valid fields
            fieldCount: countFormFields(form),
            // Format the created date
            created: form.created_at ? new Date(form.created_at).toLocaleDateString() : 'Unknown',
            createdDate: form.created_at ? new Date(form.created_at) : new Date(),
            form_id: form.form_id || form.id,
            // Check all possible archive status properties from API
            archived: form.archived === true || form.archived === 'true' ||
              form.archieve_status === true || form.archieve_status === 'true' ||
              form.isarchieved === true || form.isarchieved === 'true',
            // Ensure isarchieved property is also set correctly
            isarchieved: form.isarchieved === true || form.isarchieved === 'true' ||
              form.archived === true || form.archived === 'true' ||
              form.archieve_status === true || form.archieve_status === 'true'
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

  const copyFormLink = (formId, isArchived) => {
    if (isArchived) {
      toast.error("Cannot copy link: Form is archived")
      return
    }

    const link = `${window.location.origin}/forms/${formId}?user_id=${USER_ID}`
    navigator.clipboard.writeText(link)
    toast.success("Form link copied to clipboard!")
  }

  const openFormInNewTab = (formId, isArchived) => {
    if (isArchived) {
      toast.error("Cannot open form: Form is archived")
      return
    }

    const link = `${window.location.origin}/forms/${formId}?user_id=${USER_ID}`
    window.open(link, '_blank', 'noopener,noreferrer')
    toast.info("Opening form in new tab")
  }

  const handleEditForm = async (formId) => {
    try {
      toast.info("Loading form details...")
      const formDetails = await getFormDetails(formId)
      
      // Debug: Log the form details to see what fields are available
      console.log('🔍 Form details from API:', formDetails)
      console.log('🔍 Available retry count fields:', {
        max_retry_count: formDetails.max_retry_count,
        retry_count: formDetails.retry_count,
        maxRetryCount: formDetails.maxRetryCount,
        retryCount: formDetails.retryCount
      })

      // Parse the fields for editing
      const parsedFields = formDetails.fields.map(field => {
        const parsedField = parseFieldData(field)

        // Parse validation if it's a string
        let validation = {}
        if (typeof parsedField.validation === 'string') {
          try {
            validation = JSON.parse(parsedField.validation)
          } catch (e) {
            console.warn('Failed to parse validation:', parsedField.validation)
          }
        } else if (typeof parsedField.validation === 'object') {
          validation = parsedField.validation
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
              console.log('🔍 Parsing nested field options:', nestedField.options)
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
              console.log('🔍 Parsed nested field options:', parsedNestedField.options)

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
          console.log('🔍 Found field-level nestedFields:', nestedFields)
        }

        if (Array.isArray(parsedField.options)) {
          options = parsedField.options
        } else if (typeof parsedField.options === 'string') {
          try {
            const parsedOptions = JSON.parse(parsedField.options)
            console.log('🔍 Raw parsed options:', parsedOptions)
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
                  console.log('🔍 Option is not an object or missing value:', option)
                  return typeof option === 'string' ? option : (option.value || option.label || 'Option')
                }
              })
              console.log('🔍 Final options array:', options)
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

      console.log('Parsed fields for editing:', parsedFields)
      console.log('🔍 Debug - First field nestedFields:', parsedFields[0]?.nestedFields)
      console.log('🔍 Debug - First field options:', parsedFields[0]?.options)

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

      // Prepare the data for API
      const apiData = {
        form_id: editingForm.form_id,
        table_id: process.env.NEXT_PUBLIC_TABLE_ID,
        organization_id: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
        form_name: updatedData.form_name,
        description: updatedData.description,
        retry_count: updatedData.retry_count || editingForm.retry_count || editingForm.max_retry_count || "2",
        fields: updatedData.fields.map(field => {
          const fieldObj = {
            name: field.name || field.id,
            type: field.type,
            required: field.required ? "true" : "false",
            label: field.label || field.name || 'Field',
            placeholder: field.placeholder || ""
          }

          // Handle options - convert array to JSON string
          if ((field.type === "select" || field.type === "checkbox" || field.type === "radio") && field.options) {
            fieldObj.options = JSON.stringify(Array.isArray(field.options) ? field.options : [])
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

          console.log('Field being sent:', {
            id: fieldObj.id,
            name: fieldObj.name,
            type: fieldObj.type,
            validations: fieldObj.validations,
            hasNested: fieldObj.hasNested,
            isLeadColumn: fieldObj.isLeadColumn
          })

          return fieldObj
        })
      }

      console.log('Sending update data to API:', JSON.stringify(apiData, null, 2))

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

  // Pagination functions
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading forms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Forms</h1>
          <p className="text-muted-foreground">
            Manage and view all your created forms
          </p>
        </div>
        <Button onClick={refreshForms} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search forms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Results Count */}
            <div className="flex items-center justify-end text-sm text-muted-foreground">
              Showing {paginatedForms.length} of {filteredForms.length} forms
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forms List ({filteredForms.length} forms)</CardTitle>
        </CardHeader>
        <CardContent>
          {forms.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Forms Found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created any forms yet, or there was an error loading them.
              </p>
              <Button onClick={refreshForms} variant="outline">
                Try Again
              </Button>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Matching Forms</h3>
              <p className="text-muted-foreground mb-4">
                No forms match your current search and filter criteria.
              </p>
              <Button
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("form_name")}
                    >
                      <div className="flex items-center gap-1">
                        Form Name
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("fieldCount")}
                    >
                      <div className="flex items-center gap-1">
                        Fields
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("createdDate")}
                    >
                      <div className="flex items-center gap-1">
                        Created
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedForms.map((form) => (
                    <TableRow key={form.form_id}>
                      <TableCell className="font-medium">
                        <div>
                          {form.form_name}
                          <div className="text-xs text-muted-foreground mt-1">
                            ID: {form.form_id?.substring(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {form.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {form.fieldCount || 0} fields
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {form.created}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              form.archived ? "destructive" :
                                form.published ? "default" : "secondary"
                            }
                          >
                            {form.archived ? "Archived" : form.published ? "Published" : "Draft"}
                          </Badge>
                          {form.archived && (
                            <span className="text-xs text-muted-foreground">
                              Inactive - Users cannot access
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditForm(form.form_id)}
                            title="Edit form"
                            disabled={form.archived}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyFormLink(form.form_id, form.archived)}
                            title={form.archived ? "Form archived - cannot copy link" : "Copy form link"}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openFormInNewTab(form.form_id, form.archived)}
                            title={form.archived ? "Form archived - cannot open" : "Open form in new tab"}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="View analytics"
                            disabled
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={form.archived ? "default" : "outline"}
                            onClick={() => toggleArchiveForm(form.form_id, form.archived)}
                            title={form.archived ? "Unarchive form" : "Archive form"}
                            disabled={archivingForm === form.form_id}
                          >
                            {archivingForm === form.form_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : form.archived ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => confirmDelete(form)}
                            title="Delete form"
                            disabled={deletingForm === form.form_id}
                          >
                            {deletingForm === form.form_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show</span>
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
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>

                    {/* Page info */}
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                  </div>

                  {/* Pagination controls */}
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
                </div>
              )}

              {/* Show pagination info even when there's only one page */}
              {totalPages <= 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show</span>
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
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>

                    {/* Page info */}
                    <div className="text-sm text-muted-foreground">
                      Page 1 of 1
                    </div>
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
              This action cannot be undone. This will permanently delete the form "
              <span className="font-semibold">{formToDelete?.form_name}</span>" and all of its data.
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
              onClick={() => deleteForm(formToDelete?.form_id)}
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
  )
}