"use client"

import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Eye, Edit, Shield, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
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

export function UserTable({
    users = [],
    loading = false,
    onView,
    onEdit,
    onManageRoles,
    onToggleStatus,
    getRoleName,
    getReportingManagerName,
    getUserRolePriority,
}) {
    const [sorting, setSorting] = useState([])
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    })

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "U"
    }

    const columns = [
        {
            accessorKey: "user",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent p-0 h-auto font-semibold"
                    >
                        User
                        <SortIcon column={column} />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const user = row.original
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {getInitials(user.first_name, user.last_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">
                                {user.first_name} {user.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                        </div>
                    </div>
                )
            },
            sortingFn: (rowA, rowB) => {
                const nameA = `${rowA.original.first_name} ${rowA.original.last_name}`.toLowerCase()
                const nameB = `${rowB.original.first_name} ${rowB.original.last_name}`.toLowerCase()
                return nameA.localeCompare(nameB)
            },
        },
        {
            accessorKey: "role",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent p-0 h-auto font-semibold"
                    >
                        Role
                        <SortIcon column={column} />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return (
                    <Badge variant="secondary" className="font-normal">
                        {getRoleName(row.original)}
                    </Badge>
                )
            },
            sortingFn: (rowA, rowB) => {
                const roleA = getRoleName(rowA.original).toLowerCase()
                const roleB = getRoleName(rowB.original).toLowerCase()
                return roleA.localeCompare(roleB)
            },
        },
        {
            accessorKey: "reporting_to",
            header: "Reporting To",
            cell: ({ row }) => {
                return (
                    <span className="text-sm text-muted-foreground">
                        {getReportingManagerName(row.original)}
                    </span>
                )
            },
        },
        {
            accessorKey: "is_active",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent p-0 h-auto font-semibold"
                    >
                        Status
                        <SortIcon column={column} />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const user = row.original
                return (
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={user.is_active}
                            onCheckedChange={(checked) => onToggleStatus(user, checked)}
                            className="data-[state=checked]:bg-green-500"
                        />
                        <span className={`text-sm font-medium ${user.is_active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {user.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                )
            },
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const user = row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => onView(user)}
                                    >
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">View Details</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => onEdit(user)}
                                    >
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit User</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit User</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span tabIndex={getUserRolePriority && getUserRolePriority(user) === 1 ? 0 : undefined}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none"
                                            onClick={() => onManageRoles(user)}
                                            disabled={getUserRolePriority ? getUserRolePriority(user) === 1 : false}
                                        >
                                            <Shield className="h-4 w-4" />
                                            <span className="sr-only">Manage Roles</span>
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {getUserRolePriority && getUserRolePriority(user) === 1
                                        ? "Superuser role cannot be changed"
                                        : "Manage Roles"}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )
            },
        },
    ]

    const table = useReactTable({
        data: users,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        state: {
            sorting,
            pagination,
        },
    })

    // Remove the early return for loading to show skeletons inside the table structure

    if (users.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>No users found</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent bg-muted/40 border-b-2">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="text-foreground py-4 px-6">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: pagination.pageSize }).map((_, i) => (
                                    <TableRow key={i}>
                                        {columns.map((_, j) => (
                                            <TableCell key={j} className="px-6 py-4">
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
                                        className="hover:bg-muted/50"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="px-6">
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
            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/5">
                <div className="flex flex-wrap items-center gap-4 order-2 sm:order-1 justify-center sm:justify-start">
                    <div className="flex items-center gap-2 border-muted-foreground/20">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            Show
                        </span>
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
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            per page
                        </span>
                    </div>

                    <div className="text-sm font-medium border-l pl-4 text-muted-foreground">
                        Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                        {Math.min(
                            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                            table.getFilteredRowModel().rows.length
                        )}{" "}
                        of {table.getFilteredRowModel().rows.length} users
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