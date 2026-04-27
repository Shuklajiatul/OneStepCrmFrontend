"use client"

import { Button } from "@/components/ui/button"
import { UserPlus, RefreshCw } from "lucide-react"

import { useUserManagement } from "./hooks/use-user-management"
import { UserStats } from "./components/user-stats"
import { UserFilters } from "./components/user-filters"
import { UserTable } from "./components/user-table"
import { UserDialogs } from "./components/user-dialogs"
import { PageBreadcrumb } from "@/components/page-breadcrumb"

export default function UsersClient(props) {
  const {
    users,
    loading,
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    roleFilter, setRoleFilter,
    selectedUser,
    isCreateDialogOpen, setIsCreateDialogOpen,
    isEditDialogOpen, setIsEditDialogOpen,
    isViewDialogOpen, setIsViewDialogOpen,
    isRoleDialogOpen, setIsRoleDialogOpen,
    formData, setFormData,
    roleFormData, setRoleFormData,
    availableRoles,
    availableGenes,
    availablePolicies,
    submitting,
    filteredUsers,
    pagination,
    handleCreateUser,
    handleUpdateUser,
    handleToggleStatus,
    handleAssignRole,
    handleRemoveRole,
    openCreateDialog,
    openEditDialog,
    openViewDialog,
    openRoleDialog,
    getRoleName,
    getReportingManagerName,
    getFilteredReportingUsers,
    getUserRolePriority,
    getSelectedRolePriority,
    fetchUsers
  } = useUserManagement(props)

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user access, roles, and permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => fetchUsers({ silent: false })}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <UserStats users={users} roles={availableRoles} />

      <div className="space-y-4">
        <UserFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          roles={availableRoles}
          onClearFilters={() => {
            setSearchTerm("")
            setStatusFilter("all")
            setRoleFilter("all")
          }}
        />

        <UserTable
          users={filteredUsers}
          loading={loading}
          pagination={pagination}
          onRefresh={fetchUsers}
          onView={openViewDialog}
          onEdit={openEditDialog}
          onManageRoles={openRoleDialog}
          onToggleStatus={handleToggleStatus}
          getRoleName={getRoleName}
          getReportingManagerName={getReportingManagerName}
          getUserRolePriority={getUserRolePriority}
        />
      </div>

      <UserDialogs
        isCreateOpen={isCreateDialogOpen} setIsCreateOpen={setIsCreateDialogOpen}
        isEditOpen={isEditDialogOpen} setIsEditOpen={setIsEditDialogOpen}
        isViewOpen={isViewDialogOpen} setIsViewOpen={setIsViewDialogOpen}
        isRoleOpen={isRoleDialogOpen} setIsRoleOpen={setIsRoleDialogOpen}
        formData={formData} setFormData={setFormData}
        roleFormData={roleFormData} setRoleFormData={setRoleFormData}
        selectedUser={selectedUser}
        roles={availableRoles}
        genes={availableGenes}
        policies={availablePolicies}
        loading={loading}
        submitting={submitting}
        onCreate={handleCreateUser}
        onUpdate={handleUpdateUser}
        onAssignRole={handleAssignRole}
        onRemoveRole={handleRemoveRole}
        getFilteredReportingUsers={getFilteredReportingUsers}
        getRoleName={getRoleName}
        getReportingManagerName={getReportingManagerName}
        getUserRolePriority={getUserRolePriority}
        getSelectedRolePriority={getSelectedRolePriority}
      />
    </div>
  )
}