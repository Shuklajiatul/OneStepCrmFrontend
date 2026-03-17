"use client"

import { useState } from "react"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Edit,
    Eye,
    Loader2,
    Shield,
    ChevronUp,
    ChevronDown,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

const SortIcon = ({ column }) => {
    const isSorted = column.getIsSorted()
    if (!isSorted) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />
    if (isSorted === 'asc') return <ChevronUp className="ml-2 h-4 w-4 text-primary" />
    if (isSorted === 'desc') return <ChevronDown className="ml-2 h-4 w-4 text-primary" />
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />
}

export function RoleTable({
    roles,
    loading,
    onView,
    onEdit,
}) {
    const [sorting, setSorting] = useState([])
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    })

    const columns = [
        {
            accessorKey: "role_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4 h-8 data-[state=open]:bg-accent"
                    >
                        Role Name
                        <SortIcon column={column} />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const roleName = row.original.role_name || row.original.name || "N/A"
                return (
                    <div className="font-medium text-primary truncate">
                        {roleName}
                    </div>
                )
            },
        },
        {
            accessorKey: "priority",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4 h-8 data-[state=open]:bg-accent"
                    >
                        Priority
                        <SortIcon column={column} />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return (
                    <Badge variant="secondary">
                        {row.original.priority || "N/A"}
                    </Badge>
                )
            },
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const role = row.original
                const roleId = role.role_id || role.id

                return (
                    <div className="flex items-center justify-end space-x-1">
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onView(role)}
                                        className="h-8 w-8"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>View</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(role)}
                                        className="h-8 w-8"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )
            },
        },
    ]

    const table = useReactTable({
        data: roles,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        state: {
            sorting,
            pagination,
        },
    })

    // Remove early return for loading to show skeletons in the table

    if (roles.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No roles found</p>
                <p className="text-sm mt-2">Create your first role to get started</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                    <Table className="w-full">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} className="pl-6 pr-6 h-12">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: pagination.pageSize }).map((_, i) => (
                                    <TableRow key={i}>
                                        {columns.map((_, j) => (
                                            <TableCell key={j} className="pl-6 pr-6 py-4">
                                                <Skeleton className="h-4 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="pl-6 pr-6 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/5">
                <div className="flex flex-wrap items-center gap-4 order-2 sm:order-1 justify-center sm:justify-start">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Show</span>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value))
                            }}
                        >
                            <SelectTrigger className="w-[70px] h-8 border-muted-foreground/20 text-xs shadow-none rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 15, 20].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">per page</span>
                    </div>

                    <div className="text-sm font-medium border-l pl-4 text-muted-foreground">
                        Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                        {Math.min(
                            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                            table.getFilteredRowModel().rows.length
                        )}{" "}
                        of {table.getFilteredRowModel().rows.length} roles
                    </div>
                </div>

                <div className="order-1 sm:order-2">
                    <Pagination className="justify-end w-auto mx-0">
                        <PaginationContent>
                            <PaginationItem>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        table.previousPage();
                                    }}
                                    disabled={!table.getCanPreviousPage()}
                                    className="gap-1 pl-2.5 h-8 rounded-lg"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span>Previous</span>
                                </Button>
                            </PaginationItem>

                            {(() => {
                                const totalPages = table.getPageCount()
                                const currentPage = table.getState().pagination.pageIndex + 1
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
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    table.setPageIndex(i - 1);
                                                }}
                                                isActive={currentPage === i}
                                                className="cursor-pointer h-8 w-8 rounded-lg"
                                            >
                                                {i}
                                            </PaginationLink>
                                        </PaginationItem>
                                    )
                                }
                                return pages
                            })()}

                            <PaginationItem>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        table.nextPage();
                                    }}
                                    disabled={!table.getCanNextPage()}
                                    className="gap-1 pr-2.5 h-8 rounded-lg"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>
        </div>
    )
}
