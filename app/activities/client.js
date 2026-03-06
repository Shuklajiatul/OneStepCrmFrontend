"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    CheckCircle2,
    Clock,
    Plus,
    Calendar,
    User,
    Filter,
    Search,
    Edit,
    Trash2,
    Phone,
    Mail,
    CalendarCheck,
    ListTodo,
    AlertCircle,
    X,
    ArrowUpDown,
    ChevronUp,
    ChevronDown
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { activitiesApi, usersApi, datatablesApi, recordsApi } from "@/lib/api-endpoint"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import CreateActivityDialog from "./components/create-activity-dialog"
import { PageBreadcrumb } from "@/components/page-breadcrumb"

const activityTypeIcons = {
    task: ListTodo,
    call: Phone,
    meeting: CalendarCheck,
    email: Mail,
}

const activityTypeColors = {
    task: "bg-blue-100 text-blue-700 border-blue-200",
    call: "bg-green-100 text-green-700 border-green-200",
    meeting: "bg-purple-100 text-purple-700 border-purple-200",
    email: "bg-amber-100 text-amber-700 border-amber-200",
}

const SortIcon = ({ config, sortKey }) => {
    if (config.key !== sortKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
    if (config.direction === 'asc') return <ChevronUp className="ml-2 h-4 w-4" />
    if (config.direction === 'desc') return <ChevronDown className="ml-2 h-4 w-4" />
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
}

export default function ActivitiesClient({ initialActivities = [], initialUsers = [], initialTables = [] }) {
    const [activities, setActivities] = useState(initialActivities)
    const [filteredActivities, setFilteredActivities] = useState(initialActivities)
    const [users, setUsers] = useState(initialUsers)
    const [tables, setTables] = useState(initialTables)
    const [loading, setLoading] = useState(false)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const searchParams = useSearchParams()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState("all")
    const [filterStatus, setFilterStatus] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(5)
    const [filterTable, setFilterTable] = useState("all")
    const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'desc' }) // 'asc', 'desc', 'none'

    // Related Records State
    const [relatedRecords, setRelatedRecords] = useState([])
    const [recordColumns, setRecordColumns] = useState([])
    const [loadingRecords, setLoadingRecords] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        related_table_id: "",
        related_record_id: "",
        activity_type: "task",
        title: "",
        description: "",
        due_date: "",
        assigned_to: "",
        completed: false,
    })

    const [editingActivity, setEditingActivity] = useState(null)

    useEffect(() => {
        const tokens = authUtils.getTokens()
        if (tokens?.user) {
            setCurrentUser(tokens.user)
            setFormData(prev => ({ ...prev, assigned_to: tokens.user.user_id || tokens.user.id }))
        }
    }, [])

    // Handle Deep Linking (Create Action)
    useEffect(() => {
        const action = searchParams.get('action')
        const relatedTableId = searchParams.get('related_table_id')
        const relatedRecordId = searchParams.get('related_record_id')

        if (action === 'create') {
            setFormData(prev => ({
                ...prev,
                related_table_id: relatedTableId || "",
                related_record_id: relatedRecordId || "",
            }))
            setIsCreateDialogOpen(true)
        }
    }, [searchParams])

    // Sort logic
    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'none'
        }
        setSortConfig({ key, direction })
        setCurrentPage(1)
    }


    // Filter and search logic
    useEffect(() => {
        const fetchRelatedRecords = async () => {
            const tableId = formData.related_table_id || (editingActivity && editingActivity.related_table_id)

            if (!tableId || tableId === "_none") {
                setRelatedRecords([])
                return
            }

            setLoadingRecords(true)
            try {
                const [recordsRes, columnsRes] = await Promise.all([
                    recordsApi.getAll(tableId),
                    datatablesApi.getColumns(tableId)
                ])

                let recordsData = recordsRes.data
                if (recordsData?.data && Array.isArray(recordsData.data)) {
                    recordsData = recordsData.data
                } else if (recordsData?.records && Array.isArray(recordsData.records)) {
                    recordsData = recordsData.records
                } else if (!Array.isArray(recordsData)) {
                    recordsData = []
                }

                const columnsData = columnsRes.data?.data || columnsRes.data?.columns || columnsRes.data || []

                setRelatedRecords(recordsData)
                setRecordColumns(columnsData)
            } catch (error) {
                console.error("Failed to fetch related records:", error)
            } finally {
                setLoadingRecords(false)
            }
        }

        if (isCreateDialogOpen || isEditDialogOpen) {
            fetchRelatedRecords()
        }
    }, [formData.related_table_id, isCreateDialogOpen, isEditDialogOpen, editingActivity])

    // Filter and search logic
    useEffect(() => {
        let filtered = [...activities]

        // Filter by type
        if (filterType !== "all") {
            filtered = filtered.filter(activity => activity.activity_type === filterType)
        }

        // Filter by status
        if (filterStatus === "completed") {
            filtered = filtered.filter(activity => activity.completed)
        } else if (filterStatus === "pending") {
            filtered = filtered.filter(activity => !activity.completed && new Date(activity.due_date) >= new Date())
        } else if (filterStatus === "overdue") {
            filtered = filtered.filter(activity => !activity.completed && new Date(activity.due_date) < new Date())
        }

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(activity =>
                activity.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                activity.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Filter by related record (Deep Link)
        const relatedTableIdParam = searchParams.get('related_table_id')
        const relatedRecordIdParam = searchParams.get('related_record_id')
        const action = searchParams.get('action')


        if (relatedTableIdParam && relatedRecordIdParam && action !== 'create') {
            filtered = filtered.filter(activity =>
                String(activity.related_table_id) === String(relatedTableIdParam) &&
                String(activity.related_record_id) === String(relatedRecordIdParam)
            )
        }

        // Filter by table
        if (filterTable !== "all") {
            filtered = filtered.filter(activity => String(activity.related_table_id) === String(filterTable))
        }

        // Apply Sorting
        if (sortConfig.key && sortConfig.direction !== 'none') {
            filtered.sort((a, b) => {
                let valA, valB

                switch (sortConfig.key) {
                    case 'title':
                        valA = (a.title || "").toLowerCase()
                        valB = (b.title || "").toLowerCase()
                        break
                    case 'activity_type':
                        valA = (a.activity_type || "").toLowerCase()
                        valB = (b.activity_type || "").toLowerCase()
                        break
                    case 'assigned_to':
                        valA = getUserName(a.assigned_to).toLowerCase()
                        valB = getUserName(b.assigned_to).toLowerCase()
                        break
                    case 'due_date':
                        valA = new Date(a.due_date).getTime()
                        valB = new Date(b.due_date).getTime()
                        break
                    case 'status':
                        const statusA = getActivityStatus(a).label
                        const statusB = getActivityStatus(b).label
                        // Priority: Overdue (0) > Pending (1) > Completed (2)
                        const priority = { "Overdue": 0, "Pending": 1, "Completed": 2 }
                        valA = priority[statusA] ?? 3
                        valB = priority[statusB] ?? 3
                        break
                    case 'related_table':
                        valA = getTableName(a.related_table_id).toLowerCase()
                        valB = getTableName(b.related_table_id).toLowerCase()
                        break
                    default:
                        valA = a[sortConfig.key]
                        valB = b[sortConfig.key]
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }

        setFilteredActivities(filtered)
    }, [activities, filterType, filterStatus, searchQuery, searchParams, filterTable, sortConfig, users, tables])


    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, filterType, filterStatus, filterTable])

    // Calculate pagination
    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedActivities = filteredActivities.slice(startIndex, endIndex)

    const handleItemsPerPageChange = (value) => {
        setItemsPerPage(Number(value))
        setCurrentPage(1)
    }

    const refreshActivities = async () => {
        try {
            const activitiesRes = await activitiesApi.getByOrganization()
            const activitiesData = activitiesRes.data?.data || activitiesRes.data || []
            setActivities(activitiesData)
        } catch (error) {
            console.error("Failed to refresh activities:", error)
        }
    }

    const handleCreateActivity = async () => {
        try {
            if (!formData.title || !formData.due_date || !formData.assigned_to) {
                toast.error("Please fill in all required fields")
                return
            }

            if (formData.related_table_id && formData.related_table_id !== "_none" && !formData.related_record_id) {
                toast.error("Related Record ID is required when a table is selected")
                return
            }

            const payload = { ...formData }
            if (!payload.related_table_id || payload.related_table_id === "_none") delete payload.related_table_id
            if (!payload.related_record_id) delete payload.related_record_id

            await activitiesApi.create(payload)

            toast.success("Activity created successfully")
            await refreshActivities()

            setIsCreateDialogOpen(false)
            resetForm()
        } catch (error) {
            console.error("Failed to create activity:", error)
            toast.error("Failed to create activity")
        }
    }

    const handleUpdateActivity = async () => {
        try {
            if (!editingActivity) return

            if (formData.related_table_id && formData.related_table_id !== "_none" && !formData.related_record_id) {
                toast.error("Related Record ID is required when a table is selected")
                return
            }

            const payload = {}
            if (formData.activity_type !== editingActivity.activity_type) payload.activity_type = formData.activity_type
            if (formData.title !== editingActivity.title) payload.title = formData.title
            if (formData.description !== (editingActivity.description || "")) payload.description = formData.description

            const newDueDate = new Date(formData.due_date).getTime()
            const oldDueDate = new Date(editingActivity.due_date).getTime()
            if (newDueDate !== oldDueDate) payload.due_date = formData.due_date

            if (formData.assigned_to !== editingActivity.assigned_to) payload.assigned_to = formData.assigned_to
            if (formData.completed !== editingActivity.completed) payload.completed = formData.completed

            await activitiesApi.update(
                editingActivity.activity_id,
                formData.related_table_id || "",
                formData.related_record_id || "",
                payload
            )

            toast.success("Activity updated successfully")
            await refreshActivities()

            setIsEditDialogOpen(false)
            setEditingActivity(null)
            resetForm()
        } catch (error) {
            console.error("Failed to update activity:", error)
            toast.error("Failed to update activity")
        }
    }

    const handleCompleteActivity = async (activity) => {
        // Check permissions
        const userId = currentUser?.user_id || currentUser?.id
        if (String(activity.assigned_to) !== String(userId)) {
            toast.error("You don't have permission to update this activity")
            return
        }

        try {
            await activitiesApi.complete(
                activity.activity_id,
                activity.related_table_id,
                activity.related_record_id
            )

            toast.success("Activity marked as complete")
            await refreshActivities()
        } catch (error) {
            console.error("Failed to complete activity:", error)
            toast.error("Failed to complete activity")
        }
    }

    const openEditDialog = (activity) => {
        // Check permissions
        const userId = currentUser?.user_id || currentUser?.id
        if (String(activity.assigned_to) !== String(userId)) {
            toast.error("You don't have permission to edit this activity")
            return
        }

        setEditingActivity(activity)
        setFormData({
            related_table_id: activity.related_table_id || "",
            related_record_id: activity.related_record_id || "",
            activity_type: activity.activity_type || "task",
            title: activity.title || "",
            description: activity.description || "",
            due_date: activity.due_date ? new Date(activity.due_date).toISOString().slice(0, 16) : "",
            assigned_to: activity.assigned_to || "",
            completed: activity.completed || false,
        })
        setIsEditDialogOpen(true)
    }

    const resetForm = () => {
        setFormData({
            related_table_id: "",
            related_record_id: "",
            activity_type: "task",
            title: "",
            description: "",
            due_date: "",
            assigned_to: currentUser?.user_id || currentUser?.id || "",
            completed: false,
        })
    }

    const getUserName = (userId) => {
        const user = users.find(u => (u.user_id || u.id) === userId)
        if (!user) return "Unknown"
        return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || "Unknown"
    }

    const getTableName = (tableId) => {
        const table = tables.find(t => t.table_id === tableId)
        return table?.table_name || "N/A"
    }

    const getInitials = (name) => {
        if (!name) return '?'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    }

    const getActivityStatus = (activity) => {
        if (activity.completed) return { label: "Completed", color: "bg-green-100 text-green-700 border-green-200" }
        if (new Date(activity.due_date) < new Date()) return { label: "Overdue", color: "bg-red-100 text-red-700 border-red-200" }
        return { label: "Pending", color: "bg-yellow-100 text-yellow-700 border-yellow-200" }
    }

    const stats = {
        total: filteredActivities.length,
        pending: filteredActivities.filter(a => !a.completed && new Date(a.due_date) >= new Date()).length,
        overdue: filteredActivities.filter(a => !a.completed && new Date(a.due_date) < new Date()).length,
        completed: filteredActivities.filter(a => a.completed).length,
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="p-0Data Tables md:p-0 space-y-6 max-w-[1600px] mx-auto">
            <PageBreadcrumb />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
                    <p className="text-muted-foreground">Manage your tasks, calls, meetings, and emails</p>
                </div>
                {/* <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Activity
                </Button> */}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { title: "Total", value: stats.total, icon: ListTodo, color: "text-blue-500", bg: "bg-blue-50" },
                    { title: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50" },
                    { title: "Overdue", value: stats.overdue, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
                    { title: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
                ].map((stat, i) => (
                    <Card key={i} className={`border-none ${stat.bg} rounded-xl`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="rounded-xl">
                <CardContent className="pt-0">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search activities..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-10"
                                />
                                {searchQuery && (
                                    <X
                                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                                        onClick={() => setSearchQuery("")}
                                    />
                                )}
                            </div>
                        </div>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="task">Tasks</SelectItem>
                                <SelectItem value="call">Calls</SelectItem>
                                <SelectItem value="meeting">Meetings</SelectItem>
                                <SelectItem value="email">Emails</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterTable} onValueChange={setFilterTable}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Filter by table" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tables</SelectItem>
                                {tables.map((table) => (
                                    <SelectItem key={table.table_id} value={table.table_id}>
                                        {table.table_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-xl shadow-sm overflow-hidden">
                <CardHeader className="border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>
                            {searchParams.get('related_record_id') && searchParams.get('action') !== 'create'
                                ? "Related Activities"
                                : "All Activities"
                            }
                        </CardTitle>
                        <CardDescription>
                            {searchParams.get('related_record_id') && searchParams.get('action') !== 'create'
                                ? `Showing activities for record: ${searchParams.get('related_record_id')}`
                                : "View and manage all your activities"
                            }
                        </CardDescription>
                    </div>
                    {(searchParams.get('related_record_id') && searchParams.get('action') !== 'create') && (
                        <Button variant="ghost" size="sm" onClick={() => router.push('/activities')}>
                            Clear Filter
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="pl-6">
                                        <button onClick={() => handleSort('title')} className="flex items-center hover:text-foreground">
                                            Activity
                                            <SortIcon config={sortConfig} sortKey="title" />
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button onClick={() => handleSort('activity_type')} className="flex items-center hover:text-foreground">
                                            Type
                                            <SortIcon config={sortConfig} sortKey="activity_type" />
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button onClick={() => handleSort('assigned_to')} className="flex items-center hover:text-foreground">
                                            Assigned To
                                            <SortIcon config={sortConfig} sortKey="assigned_to" />
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button onClick={() => handleSort('due_date')} className="flex items-center hover:text-foreground">
                                            Due Date
                                            <SortIcon config={sortConfig} sortKey="due_date" />
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button onClick={() => handleSort('status')} className="flex items-center hover:text-foreground">
                                            Status
                                            <SortIcon config={sortConfig} sortKey="status" />
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button onClick={() => handleSort('related_table')} className="flex items-center hover:text-foreground">
                                            Related Table
                                            <SortIcon config={sortConfig} sortKey="related_table" />
                                        </button>
                                    </TableHead>
                                    <TableHead className="text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredActivities.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                            No activities found. Create your first activity to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedActivities.map((activity, index) => {
                                        const ActivityIcon = activityTypeIcons[activity.activity_type] || ListTodo
                                        const status = getActivityStatus(activity)

                                        return (
                                            <TableRow key={`${activity.activity_id}-${index}`} className="hover:bg-accent/5">
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${activityTypeColors[activity.activity_type]}`}>
                                                            <ActivityIcon className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{activity.title}</div>
                                                            {activity.description && (
                                                                <div className="text-sm text-muted-foreground line-clamp-1">
                                                                    {activity.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={activityTypeColors[activity.activity_type]}>
                                                        {activity.activity_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6 border">
                                                            <AvatarFallback className="text-xs">
                                                                {getInitials(getUserName(activity.assigned_to))}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{getUserName(activity.assigned_to)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                        {new Date(activity.due_date).toLocaleDateString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={status.color}>
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{getTableName(activity.related_table_id)}</span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <TooltipProvider>
                                                            {!activity.completed && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleCompleteActivity(activity)}
                                                                        >
                                                                            <CheckCircle2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Mark as Complete</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => openEditDialog(activity)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Edit Activity</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {filteredActivities.length > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t">
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</p>
                                <Select
                                    value={itemsPerPage.toString()}
                                    onValueChange={handleItemsPerPageChange}
                                >
                                    <SelectTrigger className="w-[70px] h-8">
                                        <SelectValue placeholder={itemsPerPage} />
                                    </SelectTrigger>
                                    <SelectContent side="top">
                                        {[5, 10, 20, 50].map((pageSize) => (
                                            <SelectItem key={pageSize} value={pageSize.toString()}>
                                                {pageSize}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </div>

                                {totalPages > 1 && (
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                />
                                            </PaginationItem>

                                            {(() => {
                                                const pages = []
                                                const maxVisiblePages = 5
                                                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                                                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                                                if (endPage - startPage + 1 < maxVisiblePages) {
                                                    startPage = Math.max(1, endPage - maxVisiblePages + 1)
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
                                                    )
                                                }
                                                return pages
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
                </CardContent>
            </Card>

            <CreateActivityDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                initialData={formData}
                onSuccess={refreshActivities}
                currentUser={currentUser}
                users={users}
                tables={tables}
            />

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Activity</DialogTitle>
                        <DialogDescription>Update activity details</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit_activity_type">Activity Type *</Label>
                            <Select value={formData.activity_type} onValueChange={(value) => setFormData({ ...formData, activity_type: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="task">Task</SelectItem>
                                    <SelectItem value="call">Call</SelectItem>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_title">Title *</Label>
                            <Input
                                id="edit_title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter activity title"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_description">Description</Label>
                            <Textarea
                                id="edit_description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter activity description"
                                rows={3}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_due_date">Due Date *</Label>
                            <Input
                                id="edit_due_date"
                                type="datetime-local"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_assigned_to">Assign To *</Label>
                            <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user) => (
                                        <SelectItem key={user.user_id || user.id} value={user.user_id || user.id}>
                                            {getUserName(user.user_id || user.id)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_completed" className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="edit_completed"
                                    checked={formData.completed}
                                    onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                Mark as completed
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateActivity}>Update Activity</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
