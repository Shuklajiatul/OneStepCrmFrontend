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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Eye, Edit, Shield, MoreVertical, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
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
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onView(user)}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEdit(user)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onManageRoles(user)}>
                                    <Shield className="mr-2 h-4 w-4" /> Manage Roles
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
            <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="text-sm text-muted-foreground">
                    Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                    {Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                    )}{" "}
                    of {table.getFilteredRowModel().rows.length} users
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value))
                            }}
                        >
                            <SelectTrigger className="h-9 w-[130px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 15, 20].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize} per page
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => table.previousPage()}
                                    className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>

                            {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
                                const totalPages = table.getPageCount()
                                const currentPage = table.getState().pagination.pageIndex + 1
                                let displayPage

                                if (totalPages <= 5) {
                                    displayPage = i + 1
                                } else if (currentPage <= 3) {
                                    displayPage = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                    displayPage = totalPages - 4 + i
                                } else {
                                    displayPage = currentPage - 2 + i
                                }

                                return (
                                    <PaginationItem key={displayPage}>
                                        <PaginationLink
                                            onClick={() => table.setPageIndex(displayPage - 1)}
                                            isActive={currentPage === displayPage}
                                            className="cursor-pointer"
                                        >
                                            {displayPage}
                                        </PaginationLink>
                                    </PaginationItem>
                                )
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => table.nextPage()}
                                    className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>
        </div>
    )
}