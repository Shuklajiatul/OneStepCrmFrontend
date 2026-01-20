"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation" 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import TableDataView from "./table-data-view"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
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
  Plus,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  X
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { authUtils } from '@/lib/auth-utils'
import { datatablesApi } from '@/lib/api-endpoint'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const LEADS_TABLE_ID = 'dc6032a9-391b-43b6-bab3-405b397d5283'

function LeadsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [displayMode, setDisplayMode] = useState("card")
  const [groupBy, setGroupBy] = useState("status")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tableToDelete, setTableToDelete] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [currentView, setCurrentView] = useState("tables")
  const [activeTab, setActiveTab] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(9) // 9 items per page for card view (3x3 grid)

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
              <div
                className="font-semibold text-foreground truncate cursor-pointer hover:text-primary hover:underline"
                onClick={() => {
                  setSelectedTable(table)
                  setCurrentView("data")
                }}
              >
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

  // Handle deep linking to specific table
  useEffect(() => {
    const tableId = searchParams.get("tableId")
    if (tableId && tables.length > 0) {
      const targetTable = tables.find(t => String(t.table_id) === tableId)
      if (targetTable) {
        setSelectedTable(targetTable)
        setCurrentView("data")
      }
    }
  }, [searchParams, tables])

  const fetchTables = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await datatablesApi.getAll()

      // Handle different response formats
      let tablesData = []
      if (Array.isArray(response.data)) {
        tablesData = response.data
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        tablesData = response.data.data
      } else if (response.data?.tables && Array.isArray(response.data.tables)) {
        tablesData = response.data.tables
      }

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
      const response = await datatablesApi.delete(tableId)

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

  // Filter tables based on search and active tab
  const filteredTables = tables.filter(table => {
    const matchesSearch = !searchTerm ||
      table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (table.description && table.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesTab = activeTab === "all" ||
      (activeTab === "active" && table.is_active) ||
      (activeTab === "inactive" && !table.is_active)

    return matchesSearch && matchesTab
  })

  // Pagination
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedTables = filteredTables.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredTables.length / pageSize)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab])

  // Group tables based on selected grouping
  const groupedTables = () => {
    if (groupBy === "none") {
      return { "All Tables": paginatedTables }
    }

    if (groupBy === "status") {
      const active = paginatedTables.filter(table => table.is_active)
      const inactive = paginatedTables.filter(table => !table.is_active)
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

      const todayTables = paginatedTables.filter(table => {
        const createdDate = new Date(table.created_at)
        return createdDate.toDateString() === today.toDateString()
      })

      const yesterdayTables = paginatedTables.filter(table => {
        const createdDate = new Date(table.created_at)
        return createdDate.toDateString() === yesterday.toDateString()
      })

      const weekTables = paginatedTables.filter(table => {
        const createdDate = new Date(table.created_at)
        return createdDate >= weekAgo && createdDate < yesterday
      })

      const olderTables = paginatedTables.filter(table => {
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

    return { "All Tables": paginatedTables }
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
      <Badge className="bg-emerald-100/50 text-emerald-700 border-none px-3 py-1 shadow-none font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-slate-100 text-slate-500 border-none px-3 py-1 shadow-none font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        InActive
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
    <div className="space-y-8 pb-8">
      {/* Breadcrumb */}
      <PageBreadcrumb />

      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden rounded-2xl from-primary/10 via-background to-accent/5 p-4 border border-primary/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-accent/5 blur-3xl"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary ">
                <Database className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Data Tables</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-medium">
                    CRM Core
                  </Badge>
                  <span className="text-sm text-muted-foreground">Manage and view all your data repositories</span>
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
              onClick={() => router.push('/custom-table-builder')}
            >
              <Plus className="h-5 w-5" />
              Create Table
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1 text-sm font-medium">{error}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTables}
                className="hover:bg-destructive/10 text-destructive font-semibold"
              >
                Retry Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modernized Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-elevated group hover:border-primary/50 transition-all duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Database className="h-8 w-8 text-blue-500" />
          </div>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Tables</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">{tables.length}</span>
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
                  {tables.filter(t => t.is_active).length}
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
                  {tables.filter(t => !t.is_active).length}
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
                    const createdDate = new Date(t.created_at)
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


      {/* Refined Controls Bar */}
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* Enhanced Search */}
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by table name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 w-full bg-muted/30 border-none focus-visible:ring-primary focus-visible:bg-background transition-all pr-10"
            />
            {searchTerm && (
              <X
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                onClick={() => setSearchTerm("")}
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
                  {tables.filter(t => t.is_active).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="inactive" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                Inactive
                <Badge variant="secondary" className="ml-2 bg-gray-200 text-gray-700 border-none text-[10px]">
                  {tables.filter(t => !t.is_active).length}
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
              variant={displayMode === "card" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDisplayMode("card")}
              className={`h-8 px-3 gap-2 rounded-lg transition-all ${displayMode === 'card' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="text-xs font-bold">Grid</span>
            </Button>
            <Button
              variant={displayMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDisplayMode("table")}
              className={`h-8 px-3 gap-2 rounded-lg transition-all ${displayMode === 'table' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
              <List className="h-4 w-4" />
              <span className="text-xs font-bold">List</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tables Display Area */}
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

              {displayMode === "card" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupTables.map((table) => (
                    <Card key={table.table_id} className="card-elevated group flex flex-col border-none hover:ring-2 hover:ring-primary/20 transition-all duration-300">
                      <CardHeader className="pb-4 pt-6 px-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                              <Database className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle
                                className="text-lg font-bold truncate hover:text-primary transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedTable(table)
                                  setCurrentView("data")
                                }}
                              >
                                {table.table_name}
                              </CardTitle>
                              {/*<p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                                ID: {String(table.table_id).slice(0, 8)}...
                              </p>*/}
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
                                onClick={() => {
                                  setSelectedTable(table)
                                  setCurrentView("data")
                                }}
                              >
                                <Eye className="h-4 w-4 mr-3" />
                                <span className="font-semibold">View Data Hub</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary">
                                <Edit className="h-4 w-4 mr-3" />
                                <span className="font-semibold">Edit Structure</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setTableToDelete(table)
                                  setIsDeleteDialogOpen(true)
                                }}
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
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(table.is_active)}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(table.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>

                          <Button
                            variant="secondary"
                            className="w-full h-9 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-xs transition-all duration-300"
                            onClick={() => {
                              setSelectedTable(table)
                              setCurrentView("data")
                            }}
                          >
                            Access Table
                            <ArrowUpRight className="h-3 w-3 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="overflow-hidden border-none shadow-xl rounded-2xl bg-card">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader className="bg-muted/40">
                          <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px]">Table Name</TableHead>
                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px]">Description</TableHead>
                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px]">Status</TableHead>
                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px]">Created At</TableHead>
                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px] text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupTables.map((table) => (
                            <TableRow key={table.table_id} className="group hover:bg-muted/20 transition-colors">
                              <TableCell className="py-4 px-6">
                                <div className="flex items-center gap-4">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <Database className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div
                                      className="font-extrabold text-foreground cursor-pointer hover:text-primary transition-colors"
                                      onClick={() => {
                                        setSelectedTable(table)
                                        setCurrentView("data")
                                      }}
                                    >
                                      {table.table_name}
                                    </div>
                                    <div className="text-[10px] font-mono text-muted-foreground uppercase opacity-70">
                                      UUID: {String(table.table_id).slice(0, 12)}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <div className="max-w-[300px]">
                                  <p className="text-sm text-muted-foreground line-clamp-1 group-hover:line-clamp-none transition-all">
                                    {table.description || (
                                      <span className="italic opacity-50 text-xs">Unspecified narrative profile</span>
                                    )}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(table.is_active)}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <div>
                                  <div className="text-sm font-bold text-foreground">
                                    {new Date(table.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(table.created_at).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 hover:text-primary"
                                          onClick={() => {
                                            setSelectedTable(table)
                                            setCurrentView("data")
                                          }}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View Data </p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 hover:text-primary"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit Details</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-9 w-9 p-0 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                                          onClick={() => {
                                            setTableToDelete(table)
                                            setIsDeleteDialogOpen(true)
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete Table</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {filteredTables.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 bg-muted/20 p-6 rounded-2xl border border-dashed">
          <div className="text-sm font-semibold text-muted-foreground bg-background px-4 py-2 rounded-lg shadow-sm">
            Showing <span className="text-foreground">{startIndex + 1}</span> to <span className="text-foreground">{Math.min(endIndex, filteredTables.length)}</span> of <span className="text-foreground">{filteredTables.length}</span> repositories
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-10 px-6 rounded-xl font-bold hover:bg-primary/5 hover:text-primary transition-all"
            >
              Previous
            </Button>
            <div className="flex items-center gap-2 px-4 h-10 bg-background rounded-xl border font-bold text-sm">
              Page {currentPage} <span className="text-muted-foreground">/</span> {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-10 px-6 rounded-xl font-bold hover:bg-primary/5 hover:text-primary transition-all"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl max-w-md p-0 overflow-hidden">
          <div className="bg-destructive/10 p-6 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
              <AlertCircle className="h-8 w-8" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-destructive">Destroy Data Table?</DialogTitle>
              <DialogDescription className="text-destructive/80 font-medium pt-2">
                You are about to permanently delete <span className="font-bold text-destructive underline">&quot;{tableToDelete?.table_name}&quot;</span>. This action is irreversible and all associated records will be lost forever.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="p-6 bg-background flex sm:justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="px-8 h-12 rounded-xl font-bold border-muted-foreground/20">
              KEEP TABLE
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteTable(tableToDelete?.table_id)}
              disabled={loading}
              className="px-8 h-12 rounded-xl font-bold shadow-lg shadow-destructive/20"
            >
              {loading ? "DESTROYING..." : "CONFIRM DELETE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LeadsPageContent />
    </Suspense>
  )
}