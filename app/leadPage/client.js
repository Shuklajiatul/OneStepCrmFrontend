"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import TableDataView from "./components/table-data-view"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import {
    Database, RefreshCw, AlertCircle, Search,
    LayoutGrid, List, Eye, Edit, Trash2, MoreVertical,
    Calendar, Plus, ArrowUpRight, TrendingUp,
    Activity, CheckCircle2, Clock, X, ChevronLeft, ChevronRight,
    FolderOpen, Sparkles, Filter, Grid3x3, TableProperties,
    Circle, CircleCheck, CircleOff, Zap, Star, Flame
} from "lucide-react"
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Tooltip, TooltipContent,
    TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { datatablesApi } from '@/lib/api-endpoint'
import { authUtils } from '@/lib/auth-utils'
import { Skeleton } from "@/components/ui/skeleton"
import LeadPageSkeleton from "./components/lead-page-skeleton"
import { cn } from "@/lib/utils"

// ─── Enhanced Status Badge Component ─────────────────────────────────────────
function EnhancedStatusBadge({ isActive, size = "default" }) {
    const statusConfig = {
        active: {
            label: "Active",
            icon: CircleCheck,
            gradient: "from-emerald-500 to-emerald-600",
            bgGradient: "bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30",
            border: "border-emerald-300 dark:border-emerald-700",
            text: "text-emerald-700 dark:text-emerald-300",
            shadow: "shadow-emerald-100/20 dark:shadow-emerald-900/20",
            glow: "hover:shadow-emerald-500/20"
        },
        inactive: {
            label: "Inactive",
            icon: CircleOff,
            gradient: "from-gray-500 to-gray-600",
            bgGradient: "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800/40 dark:to-gray-700/30",
            border: "border-gray-300 dark:border-gray-700",
            text: "text-gray-600 dark:text-gray-400",
            shadow: "shadow-gray-100/20 dark:shadow-gray-900/20",
            glow: "hover:shadow-gray-500/20"
        }
    }

    const config = isActive ? statusConfig.active : statusConfig.inactive
    const Icon = config.icon

    const sizeClasses = {
        sm: "px-2 py-0.5 text-[10px] gap-1",
        default: "px-2.5 py-1 text-xs gap-1.5",
        lg: "px-3 py-1.5 text-sm gap-2"
    }

    return (
        <div className={cn(
            "inline-flex items-center rounded-full font-medium backdrop-blur-sm transition-all duration-300",
            config.bgGradient,
            `border ${config.border}`,
            config.shadow,
            config.glow,
            "hover:scale-105 hover:shadow-md",
            sizeClasses[size]
        )}>
            <Icon className={cn(
                "transition-transform duration-300 group-hover:scale-110",
                size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"
            )} />
            <span className={cn("font-semibold", config.text)}>{config.label}</span>
        </div>
    )
}

// ─── Compact Stat Card with Reduced Height ───────────────────────────────────
function StatCard({ icon: Icon, label, value, trend, trendValue, accent, loading, onClick, bgGradient }) {
    const trendUp = trend === "up"
    return (
        <Card
            className={cn(
                "relative overflow-hidden group border-0 transition-all duration-500 hover:shadow-xl cursor-pointer",
                bgGradient || "bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-950 dark:to-gray-900/50"
            )}
            onClick={onClick}
        >
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>

            <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        {loading ? (
                            <Skeleton className="h-7 w-16" />
                        ) : (
                            <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{value}</p>
                        )}
                        {trend && (
                            <div className="flex items-center gap-1">
                                <span className={cn(
                                    "text-[11px] font-medium flex items-center gap-0.5",
                                    trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                )}>
                                    {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                                    {trendValue}
                                </span>
                                <span className="text-[10px] text-muted-foreground">vs last week</span>
                            </div>
                        )}
                    </div>
                    <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
                        "bg-gradient-to-br shadow-md",
                        accent
                    )}>
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Empty State with Background ─────────────────────────────────────────────
function EmptyState({ searchTerm, onClear, onCreate }) {
    return (
        <div className="relative flex flex-col items-center justify-center py-16 text-center overflow-hidden rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm border border-border/50 animate-in fade-in zoom-in-95 duration-300">
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-10 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-5 shadow-sm">
                    <FolderOpen className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchTerm ? "No results found" : "No tables yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
                    {searchTerm
                        ? `No tables match "${searchTerm}". Try adjusting your search or filters.`
                        : "Get started by creating your first data table to organize and manage your leads effectively."}
                </p>
                {searchTerm ? (
                    <Button variant="outline" size="default" onClick={onClear} className="gap-2">
                        <X className="h-4 w-4" /> Clear search
                    </Button>
                ) : (
                    <Button size="default" onClick={onCreate} className="gap-2 shadow-sm hover:shadow transition-all">
                        <Plus className="h-4 w-4" /> Create your first table
                    </Button>
                )}
            </div>
        </div>
    )
}

// ─── Enhanced Table Card Component with Modern Colors ────────────────────────
function TableCard({ table, onOpen, onDelete }) {
    const [isHovered, setIsHovered] = useState(false)

    // Modern card colors based on status
    const cardColors = table.is_active
        ? {
            bg: "bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20",
            border: "border-slate-200/80 dark:border-slate-800/80",
            hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
            gradientBar: "bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500",
            iconBg: "from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 text-blue-600 dark:text-blue-400",
            hoverIconBg: "from-blue-500 to-blue-600",
            buttonBg: "from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-950/30 hover:from-blue-500 hover:to-blue-600"
        }
        : {
            bg: "bg-gradient-to-br from-white via-slate-50/30 to-slate-100/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800/30",
            border: "border-slate-200/60 dark:border-slate-800/60",
            hoverBorder: "hover:border-slate-400 dark:hover:border-slate-600",
            gradientBar: "bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400",
            iconBg: "from-slate-100 to-slate-200 dark:from-slate-800/50 dark:to-slate-700/50 text-slate-600 dark:text-slate-400",
            hoverIconBg: "from-slate-500 to-slate-600",
            buttonBg: "from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 hover:from-slate-500 hover:to-slate-600"
        }

    return (
        <Card
            className={cn(
                "group flex flex-col border transition-all duration-500 cursor-pointer overflow-hidden relative",
                cardColors.bg,
                cardColors.border,
                cardColors.hoverBorder,
                "hover:shadow-xl"
            )}
            onClick={() => onOpen(table)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Animated gradient bar */}
            <div className={cn(
                "h-1 w-full transition-all duration-500",
                cardColors.gradientBar,
                isHovered && "h-1.5"
            )} />

            {/* Background glow effect */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none",
                table.is_active
                    ? "bg-gradient-to-br from-blue-500/5 to-purple-500/5"
                    : "bg-gradient-to-br from-slate-500/5 to-gray-500/5"
            )} />

            <CardHeader className="pb-3 pt-4 px-4 relative z-10">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                            "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-all duration-300",
                            isHovered
                                ? cn("bg-gradient-to-br shadow-md", cardColors.hoverIconBg, "text-white")
                                : cn("bg-gradient-to-br", cardColors.iconBg)
                        )}>
                            <Database className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {table.table_name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] font-mono text-muted-foreground/60">
                                    ID: {String(table.table_id).slice(0, 8)}…
                                </p>
                                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                <p className="text-[10px] text-muted-foreground/60">
                                    {table.record_count || 0} records
                                </p>
                            </div>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 shrink-0 rounded-md transition-all duration-200",
                                    isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}
                            >
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48" onClick={e => e.stopPropagation()}>
                            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                                Table Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onOpen(table)} className="cursor-pointer text-sm gap-2">
                                <Eye className="h-4 w-4" /> View Data
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-sm gap-2">
                                <Edit className="h-4 w-4" /> Edit Schema
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(table)}
                                className="cursor-pointer text-sm gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                                <Trash2 className="h-4 w-4" /> Delete Table
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col px-4 pb-4 pt-0 gap-3 relative z-10">
                {/* Description */}
                <div className="flex-1 min-h-[44px]">
                    {table.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {table.description}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground/40 italic">No description provided</p>
                    )}
                </div>

                {/* Footer with enhanced status badge */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <EnhancedStatusBadge isActive={table.is_active} size="sm" />
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1" suppressHydrationWarning>
                            <Calendar className="h-3 w-3" />
                            {new Date(table.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "w-full h-8 text-xs gap-2 transition-all duration-200 bg-gradient-to-r",
                        cardColors.buttonBg,
                        "hover:text-white"
                    )}
                    onClick={e => { e.stopPropagation(); onOpen(table) }}
                >
                    <span>Open Table</span>
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </Button>
            </CardContent>
        </Card>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadsPageClient({
    initialTables = [],
    newAccessToken: propNewAccessToken = null
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialTableId = searchParams.get("tableId")
    const initialSelectedTable = initialTableId && initialTables.length > 0
        ? initialTables.find(t => String(t.table_id) === initialTableId) || null
        : null

    const [mounted, setMounted] = useState(false)
    const [tables, setTables] = useState(initialTables)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [displayMode, setDisplayMode] = useState("card")
    const [groupBy, setGroupBy] = useState("status")
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [tableToDelete, setTableToDelete] = useState(null)
    const [selectedTable, setSelectedTable] = useState(initialSelectedTable)
    const [currentView, setCurrentView] = useState(initialSelectedTable ? "data" : "tables")
    const [activeTab, setActiveTab] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(9)
    const [sortBy, setSortBy] = useState("newest")

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (propNewAccessToken) {
            authUtils.setTokens({ accessToken: propNewAccessToken })
        }
    }, [propNewAccessToken])

    useEffect(() => {
        const tableId = searchParams.get("tableId")
        if (tableId && tables.length > 0) {
            const target = tables.find(t => String(t.table_id) === tableId)
            if (target) { setSelectedTable(target); setCurrentView("data") }
        } else if (!tableId) {
            setCurrentView("tables"); setSelectedTable(null)
        }
    }, [searchParams, tables])

    useEffect(() => {
        if (!mounted) return
        if (!initialTables || initialTables.length === 0) {
            fetchTables()
        } else if (!searchParams.get("tableId")) {
            toast.success(`Loaded ${initialTables.length} tables`)
        }
    }, [mounted])

    const fetchTables = async () => {
        setLoading(true); setError(null)
        try {
            const response = await datatablesApi.getAll()
            let tablesData = []
            if (Array.isArray(response.data)) tablesData = response.data
            else if (response.data?.data && Array.isArray(response.data.data)) tablesData = response.data.data
            else if (response.data?.tables && Array.isArray(response.data.tables)) tablesData = response.data.tables
            setTables(tablesData)
            if (!searchParams.get("tableId")) toast.success(`Loaded ${tablesData.length} tables`)
        } catch (err) {
            let msg = `Failed to fetch tables: ${err.message}`
            if (err.response?.status === 403 || err.response?.status === 401 || err.message.toLowerCase().includes('access denied')) {
                msg = "Access Denied - You do not have permission to view these tables. Please contact your administrator."
            }
            setError(msg); toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteTable = async (tableId) => {
        setLoading(true)
        try {
            await datatablesApi.delete(tableId)
            toast.success("Table deleted successfully")
            setIsDeleteDialogOpen(false); setTableToDelete(null)
            fetchTables()
        } catch (err) {
            toast.error(`Failed to delete: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const openTable = (table) => {
        if (table.is_active === false) {
            toast.error(`"${table.table_name}" is currently deactivated`, {
                description: "Please activate the table in the Custom Table Builder to view its data.",
                icon: <AlertCircle className="h-4 w-4" />
            })
            return
        }
        setSelectedTable(table)
        setCurrentView("data")
        router.push(`/leadPage?tableId=${table.table_id}`)
    }

    const handleBackToTables = () => {
        setCurrentView("tables"); setSelectedTable(null)
        router.replace("/leadPage")
    }

    // Filtering and sorting
    const filteredTables = tables
        .filter(table => {
            const matchesSearch = !searchTerm ||
                table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (table.description && table.description.toLowerCase().includes(searchTerm.toLowerCase()))
            const matchesTab =
                activeTab === "all" ||
                (activeTab === "active" && table.is_active) ||
                (activeTab === "inactive" && !table.is_active)
            return matchesSearch && matchesTab
        })
        .sort((a, b) => {
            if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at)
            if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at)
            if (sortBy === "name") return a.table_name.localeCompare(b.table_name)
            return 0
        })

    // Pagination
    useEffect(() => { setCurrentPage(1) }, [searchTerm, activeTab, sortBy])
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedTables = filteredTables.slice(startIndex, endIndex)
    const totalPages = Math.max(1, Math.ceil(filteredTables.length / pageSize))

    // Grouping
    const groupedTables = () => {
        if (groupBy === "none") return { "All Tables": paginatedTables }
        if (groupBy === "status") {
            const active = paginatedTables.filter(t => t.is_active)
            const inactive = paginatedTables.filter(t => !t.is_active)
            const groups = {}
            if (active.length) groups["Active"] = active
            if (inactive.length) groups["Inactive"] = inactive
            return groups
        }
        if (groupBy === "date") {
            const today = new Date()
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
            const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)
            const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30)

            const groups = {}
            const todayTables = paginatedTables.filter(t => new Date(t.created_at).toDateString() === today.toDateString())
            const yesterdayTables = paginatedTables.filter(t => new Date(t.created_at).toDateString() === yesterday.toDateString())
            const thisWeekTables = paginatedTables.filter(t => { const d = new Date(t.created_at); return d >= weekAgo && d < yesterday })
            const thisMonthTables = paginatedTables.filter(t => { const d = new Date(t.created_at); return d >= monthAgo && d < weekAgo })
            const olderTables = paginatedTables.filter(t => new Date(t.created_at) < monthAgo)

            if (todayTables.length) groups["Today"] = todayTables
            if (yesterdayTables.length) groups["Yesterday"] = yesterdayTables
            if (thisWeekTables.length) groups["This Week"] = thisWeekTables
            if (thisMonthTables.length) groups["This Month"] = thisMonthTables
            if (olderTables.length) groups["Older"] = olderTables
            return groups
        }
        return { "All Tables": paginatedTables }
    }

    // Statistics
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const newThisWeek = tables.filter(t => new Date(t.created_at) >= weekAgo).length
    const totalRecords = tables.reduce((sum, t) => sum + (t.record_count || 0), 0)
    const activeTables = tables.filter(t => t.is_active).length

    // ── Data View ──
    if (currentView === "data" && selectedTable) {
        return <TableDataView table={selectedTable} onBack={handleBackToTables} />
    }

    // ── Main View ──
    return (
        <TooltipProvider>
            <div className="space-y-6 pb-12 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-0">
                <PageBreadcrumb />

                {/* ── Header Section ── */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                                <Database className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Tables</h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Manage, organize, and analyze your structured data repositories
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="default"
                                    className="h-9 gap-2"
                                    onClick={fetchTables}
                                    disabled={loading}
                                >
                                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                                    <span className="hidden sm:inline">Refresh</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refresh tables list</TooltipContent>
                        </Tooltip>

                        <Button
                            className="h-9 gap-2 font-medium shadow-sm hover:shadow transition-all bg-gradient-to-r from-primary to-primary/80"
                            onClick={() => router.push('/custom-table-builder')}
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create Table</span>
                        </Button>
                    </div>
                </div>

                {/* ── Error Banner ── */}
                {error && (
                    <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-gradient-to-r from-destructive/5 to-destructive/10 px-4 py-3 text-sm text-destructive animate-in slide-in-from-top-2 duration-200">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="flex-1 font-medium">{error}</span>
                        <Button variant="ghost" size="sm" onClick={fetchTables} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-3 text-xs font-semibold">
                            Try Again
                        </Button>
                    </div>
                )}

                {/* ── Stats Row with Compact Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard
                        icon={Database}
                        label="Total Tables"
                        value={tables.length}
                        trend="up"
                        trendValue="+12%"
                        accent="from-blue-500 to-blue-600 text-white shadow-blue-500/30"
                        bgGradient="bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 dark:from-blue-950/30 dark:via-gray-950 dark:to-blue-950/20"
                        loading={loading}
                        onClick={() => setActiveTab("all")}
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label="Active Tables"
                        value={activeTables}
                        trend="up"
                        trendValue="+8%"
                        accent="from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30"
                        bgGradient="bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 dark:from-emerald-950/30 dark:via-gray-950 dark:to-emerald-950/20"
                        loading={loading}
                        onClick={() => setActiveTab("active")}
                    />
                    <StatCard
                        icon={TableProperties}
                        label="Total Records"
                        value={totalRecords.toLocaleString()}
                        trend="up"
                        trendValue="+23%"
                        accent="from-violet-500 to-violet-600 text-white shadow-violet-500/30"
                        bgGradient="bg-gradient-to-br from-violet-50/80 via-white to-violet-50/40 dark:from-violet-950/30 dark:via-gray-950 dark:to-violet-950/20"
                        loading={loading}
                    />
                    <StatCard
                        icon={Sparkles}
                        label="New This Week"
                        value={newThisWeek}
                        trend={newThisWeek > 0 ? "up" : "down"}
                        trendValue={newThisWeek > 0 ? "+5" : "-2"}
                        accent="from-amber-500 to-amber-600 text-white shadow-amber-500/30"
                        bgGradient="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/30 dark:via-gray-950 dark:to-amber-950/20"
                        loading={loading}
                    />
                </div>

                {/* ── Toolbar ── */}
                <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between p-3 rounded-xl border bg-gradient-to-r from-card to-card/80 backdrop-blur-sm shadow-sm">
                    {/* Left: Search + Tabs */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        {/* Search */}
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tables by name or description..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-9 h-9 bg-background border-border/60 focus-visible:ring-primary/20 transition-all text-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Tab Filter */}
                        {mounted ? (
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                                <TabsList className="h-9 bg-muted/50 p-1">
                                    <TabsTrigger value="all" className="text-xs px-3 gap-1.5 data-[state=active]:bg-background">
                                        All
                                        <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono">
                                            {tables.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="active" className="text-xs px-3 gap-1.5 data-[state=active]:bg-background">
                                        Active
                                        <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                            {tables.filter(t => t.is_active).length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="inactive" className="text-xs px-3 gap-1.5 data-[state=active]:bg-background">
                                        Inactive
                                        <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono">
                                            {tables.filter(t => !t.is_active).length}
                                        </Badge>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        ) : (
                            <Skeleton className="h-9 w-56 rounded-lg" />
                        )}
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <div className="flex items-center gap-1.5">
                            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:block">Group</span>
                            {mounted ? (
                                <Select value={groupBy} onValueChange={setGroupBy}>
                                    <SelectTrigger className="w-32 h-8 bg-background border-border/60 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No grouping</SelectItem>
                                        <SelectItem value="status">Status</SelectItem>
                                        <SelectItem value="date">Created date</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Skeleton className="h-8 w-32 rounded-lg" />
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground hidden sm:block">Sort</span>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-28 h-8 bg-background border-border/60 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest</SelectItem>
                                    <SelectItem value="oldest">Oldest</SelectItem>
                                    <SelectItem value="name">Name A-Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="h-5 w-px bg-border hidden sm:block" />

                        {/* View toggle */}
                        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 gap-0.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDisplayMode("card")}
                                className={cn(
                                    "h-7 w-7 p-0 rounded-md transition-all",
                                    displayMode === "card"
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <Grid3x3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDisplayMode("table")}
                                className={cn(
                                    "h-7 w-7 p-0 rounded-md transition-all",
                                    displayMode === "table"
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <List className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <LeadPageSkeleton displayMode={displayMode} />
                ) : filteredTables.length === 0 ? (
                    <EmptyState
                        searchTerm={searchTerm}
                        onClear={() => setSearchTerm("")}
                        onCreate={() => router.push('/custom-table-builder')}
                    />
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedTables()).map(([groupName, groupTables], idx) => {
                            if (groupTables.length === 0) return null
                            return (
                                <div key={groupName} className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                    {/* Group header */}
                                    {/* <div className="flex items-center gap-2 px-1">
                                        <h2 className="text-sm font-semibold text-foreground tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                            {groupName}
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                                        <Badge variant="outline" className="text-[10px] font-mono bg-gradient-to-r from-muted/50 to-transparent">
                                            {groupTables.length}
                                        </Badge>
                                    </div> */}

                                    {/* Card Grid */}
                                    {displayMode === "card" ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {groupTables.map(table => (
                                                <TableCard
                                                    key={table.table_id}
                                                    table={table}
                                                    onOpen={openTable}
                                                    onDelete={(t) => { setTableToDelete(t); setIsDeleteDialogOpen(true) }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        /* Table View */
                                        <div className="rounded-xl border border-border/60 overflow-hidden bg-gradient-to-br from-card to-card/80">
                                            <Table className="w-full">
                                                <TableHeader>
                                                    <TableRow className="bg-gradient-to-r from-muted/50 to-muted/30 hover:bg-muted/40 border-b border-border/60">
                                                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-10 pl-5">
                                                            Table details
                                                        </TableHead>
                                                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-10">
                                                            Description
                                                        </TableHead>
                                                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-10">
                                                            Status
                                                        </TableHead>
                                                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-10">
                                                            Created
                                                        </TableHead>
                                                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-10 pr-5 text-right">
                                                            Actions
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {groupTables.map(table => (
                                                        <TableRow
                                                            key={table.table_id}
                                                            className="group hover:bg-muted/30 cursor-pointer transition-all duration-200"
                                                            onClick={() => openTable(table)}
                                                        >
                                                            <TableCell className="py-3 pl-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-all duration-300",
                                                                        table.is_active
                                                                            ? "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 text-blue-600 dark:text-blue-400"
                                                                            : "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/50 dark:to-slate-700/50 text-slate-600 dark:text-slate-400"
                                                                    )}>
                                                                        <Database className="h-3.5 w-3.5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                                                            {table.table_name}
                                                                        </p>
                                                                        <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                                                                            ID: {String(table.table_id).slice(0, 12)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-3 max-w-[260px]">
                                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                                    {table.description || <span className="italic text-muted-foreground/50">No description</span>}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="py-3">
                                                                <EnhancedStatusBadge isActive={table.is_active} size="sm" />
                                                            </TableCell>
                                                            <TableCell className="py-3" suppressHydrationWarning>
                                                                <p className="text-xs font-medium text-foreground">
                                                                    {new Date(table.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                    <Clock className="h-2.5 w-2.5" />
                                                                    {new Date(table.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="py-3 pr-5" onClick={e => e.stopPropagation()}>
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                                                                                onClick={() => openTable(table)}
                                                                            >
                                                                                <Eye className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="left">View data</TooltipContent>
                                                                    </Tooltip>

                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-muted"
                                                                            >
                                                                                <Edit className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="left">Edit table</TooltipContent>
                                                                    </Tooltip>

                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive"
                                                                                onClick={() => { setTableToDelete(table); setIsDeleteDialogOpen(true) }}
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="left">Delete table</TooltipContent>
                                                                    </Tooltip>
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

                {/* ── Pagination ── */}
                {filteredTables.length > pageSize && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60">
                        <p className="text-xs text-muted-foreground">
                            Showing <span className="font-semibold text-foreground">{startIndex + 1}</span>–<span className="font-semibold text-foreground">{Math.min(endIndex, filteredTables.length)}</span> of <span className="font-semibold text-foreground">{filteredTables.length}</span> tables
                        </p>

                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .reduce((acc, p, idx, arr) => {
                                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…")
                                        acc.push(p)
                                        return acc
                                    }, [])
                                    .map((p, i) =>
                                        typeof p === "string" ? (
                                            <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                                        ) : (
                                            <Button
                                                key={p}
                                                variant={p === currentPage ? "default" : "outline"}
                                                size="icon"
                                                className="h-8 w-8 text-xs"
                                                onClick={() => setCurrentPage(p)}
                                            >
                                                {p}
                                            </Button>
                                        )
                                    )
                                }
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Delete Confirmation Dialog ── */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent className="max-w-md rounded-2xl p-5">
                        <DialogHeader className="text-center items-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-destructive/10 to-destructive/5 flex items-center justify-center">
                                <Trash2 className="h-5 w-5 text-destructive" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-lg font-semibold">Delete table?</DialogTitle>
                                <DialogDescription className="text-center text-muted-foreground text-sm">
                                    You are about to permanently delete <span className="font-semibold text-foreground">"{tableToDelete?.table_name}"</span> and all its data.
                                    This action cannot be undone.
                                </DialogDescription>
                            </div>
                        </DialogHeader>

                        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                            <Button
                                variant="outline"
                                className="flex-1 h-9"
                                onClick={() => setIsDeleteDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 h-9"
                                onClick={() => handleDeleteTable(tableToDelete?.table_id)}
                                disabled={loading}
                            >
                                {loading ? "Deleting..." : "Delete permanently"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}