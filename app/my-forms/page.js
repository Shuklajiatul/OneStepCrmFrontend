"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Eye, Copy, BarChart3, Calendar, Users, ExternalLink, Loader2, Edit, Trash2, RotateCcw, Search, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import EditFormDialog from "../component/EditForm/edit-form"

// API configuration
const API_BASE_URL = 'http://10.10.15.194:3001'
const ORGANIZATION_ID = 'c8c72c21-7b5c-435a-912a-803105e7ecc9'
const TABLE_ID = '040e899d-583a-454e-92e6-d0d5a8095587'
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYxNTQ1NTU4LCJleHAiOjE3NjE2MzE5NTh9.KG9CGv2EvC-DmEiGnS9ob6Ab1hQSStI6tT6dklvbhvM'

export default function MyFormsPage() {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingForm, setEditingForm] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  
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
        `${API_BASE_URL}/api/forms/${ORGANIZATION_ID}/${TABLE_ID}/${formId}`,
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
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
      const response = await axios.post(`${API_BASE_URL}/api/forms/update`, formData, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
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

  const fetchForms = async () => {
    try {
      setLoading(true)
      
      const response = await axios.get(
        `${API_BASE_URL}/api/forms/all/${ORGANIZATION_ID}/${TABLE_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )
      const result = response.data
      console.log('API Forms Response:', result)
      
      if (result.success && Array.isArray(result.form)) {
        // Process the forms to add field counts and format dates
        const processedForms = result.form.map(form => ({
          ...form,
          // Count the number of valid fields
          fieldCount: countFormFields(form),
          // Format the created date
          created: form.created_at ? new Date(form.created_at).toLocaleDateString() : 'Unknown',
          createdDate: form.created_at ? new Date(form.created_at) : new Date(),
          form_id: form.form_id || form.id
        }))
        
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

  const copyFormLink = (formId) => {
    const link = `${window.location.origin}/forms/${formId}`
    navigator.clipboard.writeText(link)
    toast.success("Form link copied to clipboard!")
  }

  const openFormInNewTab = (formId) => {
    const link = `${window.location.origin}/forms/${formId}`
    window.open(link, '_blank', 'noopener,noreferrer')
    toast.info("Opening form in new tab")
  }

  const handleEditForm = async (formId) => {
    try {
      toast.info("Loading form details...")
      const formDetails = await getFormDetails(formId)
      
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
        
        // Parse options
        let options = []
        if (Array.isArray(parsedField.options)) {
          options = parsedField.options
        } else if (typeof parsedField.options === 'string') {
          try {
            options = JSON.parse(parsedField.options)
          } catch (e) {
            options = parsedField.options.split(',').map(opt => opt.trim()).filter(opt => opt)
          }
        }
        
        return {
          id: parsedField.id || parsedField.name || `field-${Date.now()}`,
          name: parsedField.name || parsedField.id || `field-${Date.now()}`,
          type: parsedField.type || 'text',
          label: parsedField.label || parsedField.name || 'Field',
          placeholder: parsedField.placeholder || '',
          required: parsedField.required === true || parsedField.required === 'true' || false,
          options: options,
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
      
      setEditingForm({
        ...formDetails,
        parsedFields
      })
      setEditDialogOpen(true)
      
    } catch (error) {
      console.error('Error loading form for editing:', error)
      toast.error("Failed to load form for editing")
    }
  }

  const handleUpdateForm = async (updatedData) => {
    try {
      toast.info("Updating form...")
      
      // Prepare the data for API - exactly matching the required format
      const apiData = {
        form_id: editingForm.form_id,
        table_id: TABLE_ID,
        organization_id: ORGANIZATION_ID,
        form_name: updatedData.form_name,
        description: updatedData.description,
        fields: updatedData.fields.map(field => {
          // Create field object matching the exact API format
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
          
          fieldObj.validation = JSON.stringify(validation)
          
          console.log('Field being sent:', {
            name: fieldObj.name,
            type: fieldObj.type,
            validation: fieldObj.validation,
            multiple: validation.multiple
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
  const filteredForms = forms.filter(form => {
    const matchesSearch = form.form_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "published" && form.published) ||
                         (statusFilter === "draft" && !form.published)
    
    return matchesSearch && matchesStatus
  })

  // Sort functions
  const sortedForms = [...filteredForms].sort((a, b) => {
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
    setCurrentPage(1) // Reset to first page when changing items per page
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
                        <Badge variant={form.published ? "default" : "secondary"}>
                          {form.published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditForm(form.form_id)}
                            title="Edit form"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => copyFormLink(form.form_id)}
                            title="Copy form link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openFormInNewTab(form.form_id)}
                            title="Open form in new tab"
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
    </div>
  )
}