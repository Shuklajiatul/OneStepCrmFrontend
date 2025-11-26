import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function UserFilters({
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    roles = [],
    onClearFilters
}) {
    const hasActiveFilters = statusFilter !== "all" || roleFilter !== "all" || searchTerm

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map((role) => {
                            const roleName = role.role_name || role.name || role
                            const roleValue = role.role_id || role.id || role
                            return (
                                <SelectItem key={roleValue} value={roleName}>
                                    {roleName}
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        onClick={onClearFilters}
                        className="w-full sm:w-auto"
                    >
                        Clear Filters
                    </Button>
                )}
            </div>
        </div>
    )
}
