"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
    Database,
    ArrowLeft,
    Download,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { migrationApi } from "@/lib/api-endpoint"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function MigrationStatusClient() {
    const router = useRouter()
    const [migrations, setMigrations] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Sorting state
    const [sortConfig, setSortConfig] = useState({ key: 'started_at', direction: 'desc' })

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    // Filter state
    const [filterTable, setFilterTable] = useState("all")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterSource, setFilterSource] = useState("all")

    useEffect(() => {
        fetchMigrationStatus()
    }, [])

    const fetchMigrationStatus = async () => {
        setLoading(true)
        try {
            const data = await migrationApi.getStatus()

            if (data.success) {
                setMigrations(data.data || [])
            } else {
                toast.error("Failed to fetch migration status")
            }
        } catch (error) {
            console.error("Error fetching migration status:", error)
            toast.error("Error loading migration status")
        } finally {
            setLoading(false)
        }
    }

    const downloadRowCSV = (m) => {
        const headers = ['Job ID', 'Table ID', 'Source Type', 'Status', 'Total Records', 'Processed Batches', 'Total Batches', 'Error Count', 'Started At', 'Failed At', 'Failed Reason']
        const row = [
            m.job_id,
            m.table_id,
            m.source_type,
            m.status,
            m.total_records,
            m.processed_batches,
            m.total_batches,
            m.error_count,
            m.started_at ? new Date(m.started_at).toLocaleString() : '',
            m.failed_at ? new Date(m.failed_at).toLocaleString() : '',
            m.failed_reason || ''
        ]

        const csvContent = [headers, row]
            .map(r => r.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `migration-${m.job_id.slice(0, 8)}.csv`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('CSV downloaded')
    }

    const downloadErrors = async (m) => {
        try {
            const response = await migrationApi.downloadErrors(m.job_id)
            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `migration-errors-${m.job_id.slice(0, 8)}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('Error CSV downloaded')
        } catch (error) {
            console.error('Error downloading errors:', error)
            toast.error('Failed to download errors')
        }
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            completed: { variant: "default", icon: CheckCircle2, className: "bg-green-500" },
            processing: { variant: "secondary", icon: Clock, className: "bg-blue-500" },
            failed: { variant: "destructive", icon: XCircle, className: "bg-red-500" },
            pending: { variant: "outline", icon: Clock, className: "" }
        }

        const config = statusConfig[status] || statusConfig.pending
        const Icon = config.icon

        return (
            <Badge variant={config.variant} className={config.className}>
                <Icon className="h-3 w-3 mr-1" />
                {status}
            </Badge>
        )
    }

    // Filter, Sort and Paginate Logic
    const filteredMigrations = migrations.filter(m => {
        // Search term filter
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = !searchTerm || (
            m.table_id?.toLowerCase().includes(searchLower) ||
            m.source_type?.toLowerCase().includes(searchLower) ||
            m.status?.toLowerCase().includes(searchLower) ||
            m.job_id?.toLowerCase().includes(searchLower)
        )

        // Advanced filters
        const matchesTable = filterTable === "all" || m.table_id === filterTable
        const matchesStatus = filterStatus === "all" || m.status === filterStatus
        const matchesSource = filterSource === "all" || m.source_type === filterSource

        return matchesSearch && matchesTable && matchesStatus && matchesSource
    })

    // Get unique values for filters
    const uniqueTables = Array.from(new Set(migrations.map(m => m.table_id))).filter(Boolean).sort()
    const uniqueSources = Array.from(new Set(migrations.map(m => m.source_type))).filter(Boolean).sort()
    const uniqueStatuses = Array.from(new Set(migrations.map(m => m.status))).filter(Boolean).sort()

    const sortedMigrations = [...filteredMigrations].sort((a, b) => {
        if (sortConfig.direction === 'none' || !sortConfig.key) return 0

        let valA = a[sortConfig.key]
        let valB = b[sortConfig.key]

        if (valA === null || valA === undefined) valA = ''
        if (valB === null || valB === undefined) valB = ''

        // Handle numeric strings for records and batches
        if (typeof valA === 'string' && !isNaN(valA) && valA !== '') valA = Number(valA)
        if (typeof valB === 'string' && !isNaN(valB) && valB !== '') valB = Number(valB)

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    const totalPages = Math.ceil(sortedMigrations.length / pageSize)
    const paginatedMigrations = sortedMigrations.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    )

    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
        setCurrentPage(1)
    }

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <PageBreadcrumb />

            {/* Header — stacks on mobile, row on sm+ */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push("/migrator")}
                        aria-label="Back"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                            <Database className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                            Migration Status
                        </h1>
                        <p className="text-sm text-muted-foreground">Track all migration jobs</p>
                    </div>
                </div>

                <Button onClick={fetchMigrationStatus} disabled={loading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle className="text-base sm:text-lg">Migration Jobs</CardTitle>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(v) => {
                                    setPageSize(Number(v))
                                    setCurrentPage(1)
                                }}
                            >
                                <SelectTrigger className="w-[70px] h-9">
                                    <SelectValue placeholder="10" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 25, 50, 100].map(size => (
                                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-col md:flex-row gap-4 pt-2 border-t sm:border-t-0 sm:pt-0">
                            <div className="flex-1">
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search jobs..."
                                        className="pl-8 h-9"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value)
                                            setCurrentPage(1)
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <Select value={filterTable} onValueChange={(v) => { setFilterTable(v); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-full sm:w-[180px] h-9">
                                        <div className="flex items-center gap-2 truncate">
                                            <Database className="h-3.5 w-3.5 shrink-0" />
                                            <SelectValue placeholder="All Tables" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Tables</SelectItem>
                                        {uniqueTables.map(table => (
                                            <SelectItem key={table} value={table}>{table}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-full sm:w-[180px] h-9">
                                        <div className="flex items-center gap-2 truncate">
                                            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                                            <SelectValue placeholder="All Status" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        {uniqueStatuses.map(status => (
                                            <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterSource} onValueChange={(v) => { setFilterSource(v); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-full sm:w-[180px] h-9">
                                        <div className="flex items-center gap-2 truncate">
                                            <Database className="h-3.5 w-3.5 shrink-0" />
                                            <SelectValue placeholder="All Resources" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Resources</SelectItem>
                                        {uniqueSources.map(source => (
                                            <SelectItem key={source} value={source}>{source.toUpperCase()}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {(filterTable !== "all" || filterStatus !== "all" || filterSource !== "all" || searchTerm) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFilterTable("all");
                                            setFilterStatus("all");
                                            setFilterSource("all");
                                            setSearchTerm("");
                                            setCurrentPage(1);
                                        }}
                                        className="h-9 px-2 text-muted-foreground hover:text-foreground shrink-0"
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                    {loading && migrations.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : migrations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                            <p>No migration jobs found</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop / tablet — horizontal-scroll table */}
                            <div className="hidden sm:block overflow-x-auto rounded-lg border">
                                <Table className="w-full min-w-[700px]">
                                    <TableHeader>
                                        <TableRow>
                                            {[
                                                { label: 'Table Name', key: 'table_id' },
                                                { label: 'Source', key: 'source_type' },
                                                { label: 'Status', key: 'status' },
                                                { label: 'Records', key: 'total_records', align: 'center' },
                                                { label: 'Batches', key: 'processed_batches', align: 'center' },
                                                { label: 'Errors', key: 'error_count', align: 'center' },
                                                { label: 'Started At', key: 'started_at' },
                                            ].map((col) => (
                                                <TableHead
                                                    key={col.key}
                                                    className={cn(
                                                        "whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none",
                                                        col.align === 'right' && "text-right",
                                                        col.align === 'center' && "text-center"
                                                    )}
                                                    onClick={() => handleSort(col.key)}
                                                >
                                                    <div className={cn(
                                                        "flex items-center gap-1",
                                                        col.align === 'right' && "justify-end",
                                                        col.align === 'center' && "justify-center"
                                                    )}>
                                                        {col.label}
                                                        {sortConfig.key === col.key ? (
                                                            sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedMigrations.map((migration) => (
                                            <TableRow key={migration.job_id}>
                                                <TableCell className="whitespace-nowrap">{migration.table_id}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{migration.source_type}</Badge>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(migration.status)}</TableCell>
                                                <TableCell className="text-center">{migration.total_records}</TableCell>
                                                <TableCell className="text-center">
                                                    {migration.processed_batches} / {migration.total_batches}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {migration.error_count > 0 ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Badge variant="destructive">{migration.error_count}</Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => downloadErrors(migration)}
                                                                title="Download Error CSV"
                                                            >
                                                                <Download className="h-3.5 w-3.5 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">0</span>
                                                    )}
                                                </TableCell>
                                                <TableCell suppressHydrationWarning className="whitespace-nowrap text-sm">
                                                    {new Date(migration.started_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => downloadRowCSV(migration)}
                                                        title="Download CSV"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile — card list */}
                            <div className="sm:hidden flex flex-col divide-y">
                                {paginatedMigrations.map((migration) => (
                                    <div key={migration.job_id} className="p-4 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(migration.status)}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => downloadRowCSV(migration)}
                                                    title="Download CSV"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                            <span className="text-muted-foreground">Table</span>
                                            <span className="font-medium truncate">{migration.table_id}</span>

                                            <span className="text-muted-foreground">Source</span>
                                            <span><Badge variant="outline">{migration.source_type}</Badge></span>

                                            <span className="text-muted-foreground">Records</span>
                                            <span>{migration.total_records}</span>

                                            <span className="text-muted-foreground">Batches</span>
                                            <span>{migration.processed_batches} / {migration.total_batches}</span>

                                            <span className="text-muted-foreground">Errors</span>
                                            <span className="flex items-center gap-2">
                                                {migration.error_count > 0 ? (
                                                    <>
                                                        <Badge variant="destructive">{migration.error_count}</Badge>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => downloadErrors(migration)}
                                                            title="Download Error CSV"
                                                        >
                                                            <Download className="h-3.5 w-3.5 text-red-500" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </span>

                                            <span className="text-muted-foreground">Started</span>
                                            <span suppressHydrationWarning className="text-xs">
                                                {new Date(migration.started_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-muted/5">
                                    <div className="text-sm text-muted-foreground order-2 sm:order-1">
                                        Showing <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, sortedMigrations.length)}</span> of <span className="font-medium text-foreground">{sortedMigrations.length}</span> migrations
                                    </div>
                                    <div className="flex items-center gap-1 order-1 sm:order-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => goToPage(1)}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        <div className="flex items-center gap-1 mx-2">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }

                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => goToPage(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => goToPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
