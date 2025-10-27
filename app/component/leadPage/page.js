"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import TableDataView from "./table-data-view"
import { 
  Database, 
  RefreshCw, 
  AlertCircle, 
  Search, 
  Grid3X3, 
  List, 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Calendar,
  User,
  Settings,
  Filter,
  Plus
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import axios from "axios"
import { ScrollArea } from "@/components/ui/scroll-area"

// API Configuration
const API_BASE_URL = 'http://10.10.15.194:3001'
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYxNTQ1NTU4LCJleHAiOjE3NjE2MzE5NTh9.KG9CGv2EvC-DmEiGnS9ob6Ab1hQSStI6tT6dklvbhvM'

export default function LeadsPage() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [displayMode, setDisplayMode] = useState("card") // "card" or "table"
  const [statusFilter, setStatusFilter] = useState("all")
  const [groupBy, setGroupBy] = useState("status")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tableToDelete, setTableToDelete] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [currentView, setCurrentView] = useState("tables") // "tables" or "data"

  // Define columns for TanStack Table
  const columns = [
    {
      accessorKey: "table_name",
      header: "Table Name",
      cell: ({ row }) => {
        const table = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground truncate">
                {table.table_name}
              </div>
              <div className="text-xs text-muted-foreground">
                Table #{row.index + 1}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description")
        return (
          <div className="max-w-[260px]">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description || (
                <span className="italic text-muted-foreground/70">
                  No description provided
                </span>
              )}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active")
        return (
          <div className="flex items-center justify-start">
            {getStatusBadge(isActive)}
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return (
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
      },
    },
    {
      accessorKey: "table_id",
      header: "Table ID",
      cell: ({ row }) => {
        const tableId = row.getValue("table_id")
        return (
          <div className="flex items-center">
            <div className="font-mono text-xs bg-muted/50 px-2 py-1 rounded-md border">
              {String(tableId).slice(0, 8)}...
            </div>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const table = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title="View table data"
              onClick={() => {
                setSelectedTable(table)
                setCurrentView("data")
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title="Edit table"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-destructive/10"
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedTable(table)
                    setCurrentView("data")
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Data
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Table
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Table Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    setTableToDelete(table)
                    setIsDeleteDialogOpen(true)
                  }}
                  className="text-destructive cursor-pointer focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  // Fetch tables on component mount
  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/datatables`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        }
      })

      const tablesData = response.data
      console.log('tablesData', tablesData)
      setTables(tablesData)
      toast.success(`Loaded ${tablesData.length} tables successfully!`)
      
    } catch (err) {
      const errorMsg = `Failed to fetch tables: ${err.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error fetching tables:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTable = async (tableId) => {
    setLoading(true)
    
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/datatables/${tableId}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        }
      })

      toast.success("Table deleted successfully!")
      setIsDeleteDialogOpen(false)
      setTableToDelete(null)
      fetchTables()
      
    } catch (err) {
      toast.error(`Failed to delete table: ${err.message}`)
      console.error("Error deleting table:", err)
    } finally {
      setLoading(false)
    }
  }

  // Filter tables based on search and status
  const filteredTables = tables.filter(table => {
    const matchesSearch = !searchTerm || 
      table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (table.description && table.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && table.is_active) ||
      (statusFilter === "inactive" && !table.is_active)
    
    return matchesSearch && matchesStatus
  })

  // Group tables based on selected grouping
  const groupedTables = () => {
    if (groupBy === "none") {
      return { "All Tables": filteredTables }
    }
    
    if (groupBy === "status") {
      const active = filteredTables.filter(table => table.is_active)
      const inactive = filteredTables.filter(table => !table.is_active)
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
      
      const todayTables = filteredTables.filter(table => {
        const createdDate = new Date(table.created_at)
        return createdDate.toDateString() === today.toDateString()
      })
      
      const yesterdayTables = filteredTables.filter(table => {
        const createdDate = new Date(table.created_at)
        return createdDate.toDateString() === yesterday.toDateString()
      })
      
      const weekTables = filteredTables.filter(table => {
        const createdDate = new Date(table.created_at)
        return createdDate >= weekAgo && createdDate < yesterday
      })
      
      const olderTables = filteredTables.filter(table => {
        const createdDate = new Date(table.created_at)
        return createdDate < weekAgo
      })
      
      return {
        "Today": todayTables,
        "Yesterday": yesterdayTables,
        "This Week": weekTables,
        "Older": olderTables
      }
    }
    
    return { "All Tables": filteredTables }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
        Inactive
      </Badge>
    )
  }

  if (loading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading tables...</p>
        </div>
      </div>
    )
  }

  // Handle navigation between views
  const handleBackToTables = () => {
    setCurrentView("tables")
    setSelectedTable(null)
  }

  // Show table data view if a table is selected
  if (currentView === "data" && selectedTable) {
    return (
      <TableDataView 
        table={selectedTable} 
        onBack={handleBackToTables}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Tables</h1>
          <p className="text-muted-foreground">Manage and view all your data tables</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchTables}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
            Create Table
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
              <Button variant="outline" size="sm" onClick={fetchTables} className="ml-2">
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
                <p className="text-sm font-medium text-muted-foreground">Total Tables</p>
                <p className="text-2xl font-bold">{tables.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tables</p>
                <p className="text-2xl font-bold">
                  {tables.filter(t => t.is_active).length}
                </p>
              </div>
              <Settings className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive Tables</p>
                <p className="text-2xl font-bold">
                  {tables.filter(t => !t.is_active).length}
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
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {tables.filter(t => {
                    const createdDate = new Date(t.created_at)
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return createdDate >= weekAgo
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                  placeholder="Search tables..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="status">Group by Status</SelectItem>
                  <SelectItem value="date">Group by Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
                                    <div className="flex items-center gap-2">
                                      <Button
                variant={displayMode === "card" ? "default" : "outline"}
                                        size="sm"
                onClick={() => setDisplayMode("card")}
                className="gap-2"
                                      >
                <Grid3X3 className="h-4 w-4" />
                Card View
                                      </Button>
                                      <Button
                variant={displayMode === "table" ? "default" : "outline"}
                                        size="sm"
                onClick={() => setDisplayMode("table")}
                className="gap-2"
                                      >
                <List className="h-4 w-4" />
                Table View
                                      </Button>
                                    </div>
          </div>
        </CardContent>
      </Card>

      {/* Tables Display */}
      <div className="space-y-6">
        {Object.entries(groupedTables()).map(([groupName, groupTables]) => {
          if (groupTables.length === 0) return null
          
          return (
            <div key={groupName} className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{groupName}</h2>
                <Badge variant="outline">{groupTables.length}</Badge>
              </div>
              
              {displayMode === "card" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupTables.map((table) => (
                    <Card key={table.table_id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold truncate">
                              {table.table_name}
                            </CardTitle>
                            {table.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {table.description}
                              </p>
                                      )}
                                    </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                View Data
                                  </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Table
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                onClick={() => {
                                  setTableToDelete(table)
                                  setIsDeleteDialogOpen(true)
                                }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            {getStatusBadge(table.is_active)}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(table.created_at)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>ID: {table.table_id.slice(0, 8)}...</span>
                            </div>
                </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => {
                                setSelectedTable(table)
                                setCurrentView("data")
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                      </div>
                    </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{groupName}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {groupTables.length} table{groupTables.length !== 1 ? 's' : ''} in this group
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {groupTables.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <DataTable 
                      columns={columns} 
                      data={groupTables} 
                      searchKey="table_name"
                      searchPlaceholder="Search tables..."
                    />
                  </CardContent>
                </Card>
              )}
                </div>
          )
        })}
              </div>
              
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the table "{tableToDelete?.table_name}"? 
              This action cannot be undone and will permanently remove all data in this table.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
                </Button>
                <Button 
              variant="destructive" 
              onClick={() => handleDeleteTable(tableToDelete?.table_id)}
              disabled={loading}
                >
              {loading ? "Deleting..." : "Delete Table"}
                </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}