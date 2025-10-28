"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Save, X, Trash2, Settings, Database, RefreshCw, AlertCircle, Eye, EyeOff, Filter, Download, Upload, Search, MoreHorizontal, User, Mail, Phone, MapPin, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import axios from "axios"
import { ScrollArea } from "@/components/ui/scroll-area"

// API Configuration
const API_BASE_URL = 'http://10.10.15.194:3001'
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYxNjA0MzMwLCJleHAiOjE3NjE2OTA3MzB9.01TIxWVFuW0WIuBeZkT397mWy9UUwa9Wku7xX561upo'
const LEADS_TABLE_ID = 'dc6032a9-391b-43b6-bab3-405b397d5283'

export default function LeadsPage() {
  const [columns, setColumns] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState(new Set())
  const [editingCell, setEditingCell] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [newRecord, setNewRecord] = useState({})
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [activeTab, setActiveTab] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Fetch columns and records on component mount
  useEffect(() => {
    fetchColumnsAndRecords()
  }, [])

  const fetchColumnsAndRecords = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [columnsResponse, recordsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/datatables/${LEADS_TABLE_ID}/columns`, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          }
        }),
        axios.get(`${API_BASE_URL}/api/records/${LEADS_TABLE_ID}`, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          }
        })
      ])

      const columnsData = columnsResponse.data
      const recordsData = recordsResponse.data
      
      // Transform API response to our column format
      const transformedColumns = Array.isArray(columnsData) ? columnsData.map(col => ({
        id: col.column_id || col.id || col.name,
        name: col.column_name || col.name || 'Unnamed Column',
        type: col.data_type || col.type || 'text',
        required: col.is_required || col.required || false,
        editable: !(col.is_primary_key || col.primary_key),
        is_primary: col.is_primary_key || col.primary_key || false
      })) : []

      // Transform API response to our records format
      const transformedRecords = Array.isArray(recordsData) ? recordsData.map(record => ({
        id: record.record_id || record.id || `record-${Date.now()}-${Math.random()}`,
        cells: record,
        created_at: record.created_at || new Date().toISOString(),
        status: record.status || 'new'
      })) : []

      setColumns(transformedColumns)
      setRecords(transformedRecords)
      
      // Set all columns as visible by default
      const allColumnIds = new Set(transformedColumns.map(col => col.id))
      setVisibleColumns(allColumnIds)

      toast.success(`Loaded ${transformedRecords.length} leads successfully!`)
      
    } catch (err) {
      const errorMsg = `Failed to fetch data: ${err.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRecord = async () => {
    // Validate required fields
    const requiredColumns = columns.filter(col => col.required)
    const missingFields = requiredColumns.filter(col => !newRecord[col.id])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.map(f => f.name).join(', ')}`)
      return
    }

    setLoading(true)
    
    // Show loading toast
    const toastId = toast.loading("Adding new lead...")
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/records/${LEADS_TABLE_ID}`, {
        ...newRecord,
        created_at: new Date().toISOString(),
        status: 'new'
      }, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        }
      })

      toast.success("Lead added successfully!", { id: toastId })
      setIsAddDialogOpen(false)
      setNewRecord({})
      
      // Refresh the data
      fetchColumnsAndRecords()
      
    } catch (err) {
      toast.error(`Failed to add lead: ${err.message}`, { id: toastId })
      console.error("Error adding record:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRecord = async (recordId, updates) => {
    setLoading(true)
    
    // Show loading toast
    const toastId = toast.loading("Updating lead...")
    
    try {
      const response = await axios.put(`${API_BASE_URL}/api/records/${LEADS_TABLE_ID}/${recordId}`, updates, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        }
      })
      
      toast.success("Lead updated successfully!", { id: toastId })
      
      // Refresh the data
      fetchColumnsAndRecords()
      
    } catch (err) {
      toast.error(`Failed to update lead: ${err.message}`, { id: toastId })
      console.error("Error updating record:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecord = async (recordId) => {
    // Confirm deletion
    const confirmDelete = await new Promise((resolve) => {
      toast.custom((t) => (
        <div className="bg-white dark:bg-gray-950 p-4 rounded-lg shadow-lg border">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium">Delete Lead</p>
              <p className="text-sm text-gray-500">Are you sure you want to delete this lead? This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.dismiss(t)
                resolve(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                toast.dismiss(t)
                resolve(true)
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      ), {
        duration: Infinity,
      })
    })

    if (!confirmDelete) return

    setLoading(true)
    
    // Show loading toast
    const toastId = toast.loading("Deleting lead...")
    
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/records/${LEADS_TABLE_ID}/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        }
      })

      toast.success("Lead deleted successfully!", { id: toastId })
      
      // Refresh the data
      fetchColumnsAndRecords()
      
    } catch (err) {
      toast.error(`Failed to delete lead: ${err.message}`, { id: toastId })
      console.error("Error deleting record:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickStatusUpdate = async (recordId, newStatus) => {
    const statusLabels = {
      'new': 'New',
      'contacted': 'Contacted', 
      'qualified': 'Qualified',
      'converted': 'Converted',
      'lost': 'Lost'
    }

    const toastId = toast.loading(`Updating status to ${statusLabels[newStatus]}...`)
    
    try {
      const response = await axios.put(`${API_BASE_URL}/api/records/${LEADS_TABLE_ID}/${recordId}`, { status: newStatus }, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        }
      })

      toast.success(`Lead marked as ${statusLabels[newStatus]}!`, { id: toastId })
      fetchColumnsAndRecords()
      
    } catch (err) {
      toast.error(`Failed to update status: ${err.message}`, { id: toastId })
    }
  }

  const toggleColumnVisibility = (columnId) => {
    const newVisibleColumns = new Set(visibleColumns)
    if (newVisibleColumns.has(columnId)) {
      newVisibleColumns.delete(columnId)
      toast.info(`Hidden column: ${columns.find(col => col.id === columnId)?.name}`)
    } else {
      newVisibleColumns.add(columnId)
      toast.info(`Showing column: ${columns.find(col => col.id === columnId)?.name}`)
    }
    setVisibleColumns(newVisibleColumns)
  }

  const startEditing = (recordId, columnId, currentValue) => {
    setEditingCell({ recordId, columnId, value: currentValue })
  }

  const saveEdit = async (recordId, columnId, newValue) => {
    await handleUpdateRecord(recordId, { [columnId]: newValue })
    setEditingCell(null)
  }

  // Filter records based on search and status
  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchTerm || 
      Object.values(record.cells).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    const matchesStatus = statusFilter === "all" || record.cells.status === statusFilter
    
    let matchesTab = true
    switch (activeTab) {
      case "new":
        matchesTab = record.cells.status === "new" || !record.cells.status
        break
      case "contacted":
        matchesTab = record.cells.status === "contacted"
        break
      case "qualified":
        matchesTab = record.cells.status === "qualified"
        break
      case "converted":
        matchesTab = record.cells.status === "converted"
        break
      default:
        matchesTab = true
    }
    
    return matchesSearch && matchesStatus && matchesTab
  })

  const formatValue = (value, columnType) => {
    if (value === null || value === undefined || value === "") return "-"
    
    switch (columnType) {
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      new: { variant: "secondary", label: "New" },
      contacted: { variant: "outline", label: "Contacted" },
      qualified: { variant: "default", label: "Qualified" },
      converted: { variant: "success", label: "Converted" },
      lost: { variant: "destructive", label: "Lost" }
    }
    
    const config = statusConfig[status] || statusConfig.new
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading && columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading leads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads Management</h1>
          <p className="text-muted-foreground">Manage and track your sales leads</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchColumnsAndRecords}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Enter the lead information below. Fields marked with * are required.
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  {columns.filter(col => col.editable).map(column => (
                    <div key={column.id} className="space-y-2">
                      <label className="text-sm font-medium">
                        {column.name}
                        {column.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {column.type === 'textarea' ? (
                        <Textarea
                          placeholder={`Enter ${column.name.toLowerCase()}`}
                          value={newRecord[column.id] || ""}
                          onChange={(e) => setNewRecord({
                            ...newRecord,
                            [column.id]: e.target.value
                          })}
                        />
                      ) : column.type === 'select' ? (
                        <Select
                          value={newRecord[column.id] || ""}
                          onValueChange={(value) => setNewRecord({
                            ...newRecord,
                            [column.id]: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.name.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={column.type === 'date' ? 'date' : 'text'}
                          placeholder={`Enter ${column.name.toLowerCase()}`}
                          value={newRecord[column.id] || ""}
                          onChange={(e) => setNewRecord({
                            ...newRecord,
                            [column.id]: e.target.value
                          })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRecord} disabled={loading}>
                  {loading ? "Adding..." : "Add Lead"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchColumnsAndRecords} className="ml-2">
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
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Leads</p>
                <p className="text-2xl font-bold">
                  {records.filter(r => !r.cells.status || r.cells.status === 'new').length}
                </p>
              </div>
              <Mail className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contacted</p>
                <p className="text-2xl font-bold">
                  {records.filter(r => r.cells.status === 'contacted').length}
                </p>
              </div>
              <Phone className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Converted</p>
                <p className="text-2xl font-bold">
                  {records.filter(r => r.cells.status === 'converted').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Controls */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All Leads</TabsTrigger>
                <TabsTrigger value="new">New</TabsTrigger>
                <TabsTrigger value="contacted">Contacted</TabsTrigger>
                <TabsTrigger value="qualified">Qualified</TabsTrigger>
                <TabsTrigger value="converted">Converted</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full sm:w-64"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {columns.map(column => (
                      <DropdownMenuItem 
                        key={column.id}
                        onClick={() => toggleColumnVisibility(column.id)}
                        className="flex items-center gap-2"
                      >
                        {visibleColumns.has(column.id) ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                        <span>{column.name}</span>
                        {column.is_primary && (
                          <Badge variant="outline" className="ml-auto text-xs">PK</Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <TabsContent value={activeTab} className="mt-4">
              {/* Data Table */}
              <ScrollArea className="w-full">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns
                          .filter(column => visibleColumns.has(column.id))
                          .map(column => (
                            <TableHead key={column.id} className="font-medium">
                              <div className="flex items-center gap-2">
                                {column.name}
                                {column.is_primary && (
                                  <Badge variant="outline" className="text-xs">PK</Badge>
                                )}
                              </div>
                            </TableHead>
                          ))
                        }
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.length === 0 ? (
                        <TableRow>
                          <TableCell 
                            colSpan={columns.filter(col => visibleColumns.has(col.id)).length + 1}
                            className="text-center py-8 text-muted-foreground"
                          >
                            {records.length === 0 ? "No leads found" : "No matching leads found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.map(record => (
                          <TableRow key={record.id} className="hover:bg-muted/50">
                            {columns
                              .filter(column => visibleColumns.has(column.id))
                              .map(column => (
                                <TableCell key={`${record.id}-${column.id}`}>
                                  {editingCell?.recordId === record.id && editingCell?.columnId === column.id ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={editingCell.value}
                                        onChange={(e) => setEditingCell({
                                          ...editingCell,
                                          value: e.target.value
                                        })}
                                        className="h-8"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => saveEdit(record.id, column.id, editingCell.value)}
                                      >
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingCell(null)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div
                                      className={`cursor-pointer hover:bg-muted p-1 rounded ${
                                        column.editable ? 'hover:ring-1 hover:ring-primary/30' : ''
                                      }`}
                                      onClick={() => column.editable && startEditing(
                                        record.id, 
                                        column.id, 
                                        record.cells[column.id]
                                      )}
                                    >
                                      {column.name.toLowerCase().includes('status') ? (
                                        getStatusBadge(record.cells[column.id])
                                      ) : (
                                        formatValue(record.cells[column.id], column.type)
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              ))
                            }
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedRecord(record)
                                      setIsViewDialogOpen(true)
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleQuickStatusUpdate(record.id, 'contacted')}
                                  >
                                    <Phone className="h-4 w-4 mr-2" />
                                    Mark Contacted
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleQuickStatusUpdate(record.id, 'qualified')}
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    Mark Qualified
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteRecord(record.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Basic Information</h3>
                  {columns.filter(col => 
                    ['name', 'email', 'phone', 'company', 'title'].some(key => 
                      col.name.toLowerCase().includes(key)
                    )
                  ).map(column => (
                    <div key={column.id} className="grid grid-cols-3 gap-4 py-2">
                      <div className="font-medium text-sm">{column.name}:</div>
                      <div className="col-span-2 text-sm">
                        {formatValue(selectedRecord.cells[column.id], column.type)}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">Status & Additional Info</h3>
                  {columns.filter(col => 
                    ['status', 'source', 'created', 'notes'].some(key => 
                      col.name.toLowerCase().includes(key)
                    )
                  ).map(column => (
                    <div key={column.id} className="grid grid-cols-3 gap-4 py-2">
                      <div className="font-medium text-sm">{column.name}:</div>
                      <div className="col-span-2 text-sm">
                        {column.name.toLowerCase().includes('status') ? (
                          getStatusBadge(selectedRecord.cells[column.id])
                        ) : (
                          formatValue(selectedRecord.cells[column.id], column.type)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => handleQuickStatusUpdate(selectedRecord.id, 'contacted')}
                >
                  Mark as Contacted
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleQuickStatusUpdate(selectedRecord.id, 'qualified')}
                >
                  Mark as Qualified
                </Button>
                <Button 
                  onClick={() => handleQuickStatusUpdate(selectedRecord.id, 'converted')}
                >
                  Mark as Converted
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}