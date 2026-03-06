"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, Database, ArrowLeft, Download } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { migrationApi } from "@/lib/api-endpoint"

export default function MigrationStatusClient() {
    const router = useRouter()
    const [migrations, setMigrations] = useState([])
    const [loading, setLoading] = useState(false)

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
                    <CardTitle className="text-base sm:text-lg">Migration Jobs</CardTitle>
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
                                            <TableHead className="whitespace-nowrap">Table Name</TableHead>
                                            <TableHead className="whitespace-nowrap">Source</TableHead>
                                            <TableHead className="whitespace-nowrap">Status</TableHead>
                                            <TableHead className="whitespace-nowrap text-right">Records</TableHead>
                                            <TableHead className="whitespace-nowrap text-right">Batches</TableHead>
                                            <TableHead className="whitespace-nowrap text-right">Errors</TableHead>
                                            <TableHead className="whitespace-nowrap">Started At</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {migrations.map((migration) => (
                                            <TableRow key={migration.job_id}>
                                                <TableCell className="whitespace-nowrap">{migration.table_id}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{migration.source_type}</Badge>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(migration.status)}</TableCell>
                                                <TableCell className="text-right">{migration.total_records}</TableCell>
                                                <TableCell className="text-right">
                                                    {migration.processed_batches} / {migration.total_batches}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {migration.error_count > 0 ? (
                                                        <div className="flex items-center justify-end gap-2">
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
                                {migrations.map((migration) => (
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
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
