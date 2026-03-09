"use client"

import { Button } from "@/components/ui/button"
import { ShieldPlus, RefreshCw } from "lucide-react"

import { useRoleManagement } from "./hooks/use-role-management"
import { RoleStats } from "./components/role-stats"
import { RoleFilters } from "./components/role-filters"
import { RoleTable } from "./components/role-table"
import { RoleDialogs } from "./components/role-dialogs"
import { PageBreadcrumb } from "@/components/page-breadcrumb"

export default function RolesClient(props) {
    const {
        roles,
        loading,
        searchTerm, setSearchTerm,
        selectedRole,
        isCreateDialogOpen, setIsCreateDialogOpen,
        isEditDialogOpen, setIsEditDialogOpen,
        isViewDialogOpen, setIsViewDialogOpen,
        formData, setFormData,
        submitting,
        filteredRoles,
        handleCreateRole,
        handleUpdateRole,
        fetchRoles,
        openEditDialog,
        openViewDialog,
        openCreateDialog
    } = useRoleManagement(props)

    return (
        <div className="space-y-6">
            <PageBreadcrumb />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
                    <p className="text-muted-foreground">
                        Create, manage, and configure roles for your organization.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="default"
                        onClick={fetchRoles}
                        disabled={loading}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={openCreateDialog}>
                        <ShieldPlus className="mr-2 h-4 w-4" />
                        Create Role
                    </Button>
                </div>
            </div>

            <RoleStats roles={roles} loading={loading} />

            <div className="space-y-4">
                <RoleFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    onClearFilters={() => setSearchTerm("")}
                />

                <RoleTable
                    roles={filteredRoles}
                    loading={loading}
                    onView={openViewDialog}
                    onEdit={openEditDialog}
                />
            </div>

            <RoleDialogs
                isCreateOpen={isCreateDialogOpen} setIsCreateOpen={setIsCreateDialogOpen}
                isEditOpen={isEditDialogOpen} setIsEditOpen={setIsEditDialogOpen}
                isViewOpen={isViewDialogOpen} setIsViewOpen={setIsViewDialogOpen}
                formData={formData} setFormData={setFormData}
                selectedRole={selectedRole}
                submitting={submitting}
                onCreate={handleCreateRole}
                onUpdate={handleUpdateRole}
                onEditFromView={openEditDialog}
            />
        </div>
    )
}
