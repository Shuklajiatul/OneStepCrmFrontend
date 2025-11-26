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
import { Eye, Edit, Shield, MoreVertical, Loader2, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"

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
                        <ArrowUpDown className="ml-2 h-4 w-4" />
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
                        <ArrowUpDown className="ml-2 h-4 w-4" />
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
                        <ArrowUpDown className="ml-2 h-4 w-4" />
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

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
                            {table.getRowModel().rows?.length ? (
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
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Show</span>
                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span>per page</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Go to previous page</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Go to next page</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}