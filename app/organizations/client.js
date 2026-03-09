"use client"

import { Button } from "@/components/ui/button"
import { Building2, RefreshCw } from "lucide-react"
import { PageBreadcrumb } from "@/components/page-breadcrumb"

import { useOrganizationManagement } from "./hooks/use-organization-management"
import { OrganizationStats } from "./components/organization-stats"
import { OrganizationFilters } from "./components/organization-filters"
import { OrganizationTable } from "./components/organization-table"
import { OrganizationDialogs } from "./components/organization-dialogs"

export default function OrganizationsClient(props) {
    const {
        organizations,
        loading,
        searchTerm, setSearchTerm,
        tierFilter, setTierFilter,
        selectedOrganization,
        isCreateDialogOpen, setIsCreateDialogOpen,
        isEditDialogOpen, setIsEditDialogOpen,
        isViewDialogOpen, setIsViewDialogOpen,
        organizationToDelete, setOrganizationToDelete,
        formData, setFormData,
        submitting,
        deleteSubmitting,
        filteredOrganizations,
        handleCreateOrganization,
        handleUpdateOrganization,
        handleDeleteOrganization,
        fetchOrganizations,
        openEditDialog,
        openViewDialog,
        openCreateDialog
    } = useOrganizationManagement(props)

    return (
        <div className="space-y-6">
            <PageBreadcrumb />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
                    <p className="text-muted-foreground">
                        Create, manage, and configure organizations for your system.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="default"
                        onClick={fetchOrganizations}
                        disabled={loading}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={openCreateDialog}>
                        <Building2 className="mr-2 h-4 w-4" />
                        Create Organization
                    </Button>
                </div>
            </div>

            <OrganizationStats organizations={organizations} loading={loading} />

            <div className="space-y-4">
                <OrganizationFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    tierFilter={tierFilter}
                    setTierFilter={setTierFilter}
                    onClearFilters={() => {
                        setSearchTerm("")
                        setTierFilter("all")
                    }}
                />

                <OrganizationTable
                    organizations={filteredOrganizations}
                    loading={loading}
                    onView={openViewDialog}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteOrganization}
                    organizationToDelete={organizationToDelete}
                    setOrganizationToDelete={setOrganizationToDelete}
                    deleteSubmitting={deleteSubmitting}
                />
            </div>

            <OrganizationDialogs
                isCreateOpen={isCreateDialogOpen} setIsCreateOpen={setIsCreateDialogOpen}
                isEditOpen={isEditDialogOpen} setIsEditOpen={setIsEditDialogOpen}
                isViewOpen={isViewDialogOpen} setIsViewOpen={setIsViewDialogOpen}
                formData={formData} setFormData={setFormData}
                selectedOrganization={selectedOrganization}
                submitting={submitting}
                onCreate={handleCreateOrganization}
                onUpdate={handleUpdateOrganization}
                onEditFromView={openEditDialog}
            />
        </div>
    )
}
