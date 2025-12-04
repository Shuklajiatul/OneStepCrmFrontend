import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"

export function useOrganizationManagement({ initialOrganizations = [] }) {
    const [organizations, setOrganizations] = useState(initialOrganizations)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [tierFilter, setTierFilter] = useState("all")
    const [selectedOrganization, setSelectedOrganization] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [deleteSubmitting, setDeleteSubmitting] = useState(false)

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [organizationToDelete, setOrganizationToDelete] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        subscription_tier: "free",
        settings: null,
    })

    // Fetchers
    const fetchOrganizations = async () => {
        try {
            setLoading(true)
            const response = await apiClient.get('/api/organizations')

            if (response.data) {
                const orgData = Array.isArray(response.data)
                    ? response.data
                    : response.data.data || response.data.organizations || []
                setOrganizations(orgData)
            }
        } catch (error) {
            console.error("Error fetching organizations:", error)
            if (error.response?.status === 404) {
                toast.info("Organizations API endpoint not found.")
                setOrganizations([])
            } else {
                // 401 is handled by apiClient interceptor
                toast.error("Failed to fetch organizations.")
            }
        } finally {
            setLoading(false)
        }
    }

    const fetchOrganizationDetails = async (organizationId) => {
        try {
            const response = await apiClient.get(`/api/organizations/${organizationId}`)

            if (response.data) {
                const orgData = response.data.data || response.data
                setSelectedOrganization(orgData)
                setFormData({
                    name: orgData.name || "",
                    subscription_tier: orgData.subscription_tier || "free",
                    settings: orgData.settings || null,
                })
                return orgData
            }
        } catch (error) {
            console.error("Error fetching organization details:", error)
            toast.error("Failed to fetch organization details")
            return null
        }
    }

    // Handlers
    const handleCreateOrganization = async () => {
        if (!formData.name || formData.name.trim() === "") {
            toast.error("Organization name is required")
            return
        }

        try {
            setSubmitting(true)
            const payload = {
                name: formData.name.trim(),
                subscription_tier: formData.subscription_tier || "free",
            }

            if (formData.settings) {
                payload.settings = formData.settings
            }

            const response = await apiClient.post('/api/organizations', payload)

            if (response.data) {
                toast.success("Organization created successfully")
                setIsCreateDialogOpen(false)
                resetForm()
                fetchOrganizations()
            }
        } catch (error) {
            console.error("Error creating organization:", error)
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to create organization"
            toast.error(errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    const handleUpdateOrganization = async () => {
        if (!selectedOrganization?.organization_id) return

        if (!formData.name || formData.name.trim() === "") {
            toast.error("Organization name is required")
            return
        }

        try {
            setSubmitting(true)
            const organizationId = selectedOrganization.organization_id

            const payload = {
                name: formData.name.trim(),
                subscription_tier: formData.subscription_tier || "free",
                settings: formData.settings || {},
            }

            const response = await apiClient.put(
                `/api/organizations/${organizationId}`,
                payload
            )

            if (response.data) {
                toast.success("Organization updated successfully")
                setIsEditDialogOpen(false)
                resetForm()
                fetchOrganizations()
            }
        } catch (error) {
            console.error("Error updating organization:", error)
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to update organization"
            toast.error(errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteOrganization = async (organizationId) => {
        if (!organizationId) {
            toast.error("Organization ID is missing. Cannot delete organization.")
            return
        }

        try {
            setDeleteSubmitting(true)

            const response = await apiClient.delete(`/api/organizations/${organizationId}`)

            if (response.status === 200 || response.status === 204 || response.data) {
                toast.success("Organization deleted successfully")
                setOrganizationToDelete(null)
                fetchOrganizations()
            } else {
                toast.error("Unexpected response from server")
            }
        } catch (error) {
            console.error("Error deleting organization:", error)
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Failed to delete organization"
            toast.error(errorMessage)
        } finally {
            setDeleteSubmitting(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            subscription_tier: "free",
            settings: null,
        })
        setSelectedOrganization(null)
    }

    const openEditDialog = async (organization) => {
        setSelectedOrganization(organization)
        const orgDetails = await fetchOrganizationDetails(organization.organization_id)
        if (orgDetails) {
            setIsEditDialogOpen(true)
        }
    }

    const openViewDialog = async (organization) => {
        setSelectedOrganization(organization)
        await fetchOrganizationDetails(organization.organization_id)
        setIsViewDialogOpen(true)
    }

    // Filtering - Memoized for performance
    const filteredOrganizations = useMemo(() => {
        return organizations.filter((org) => {
            const orgName = org.name || ""
            const subscriptionTier = org.subscription_tier || ""
            const matchesSearch =
                !searchTerm ||
                orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                subscriptionTier.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesTier =
                tierFilter === "all" ||
                (org.subscription_tier || "").toLowerCase() === tierFilter.toLowerCase()

            return matchesSearch && matchesTier
        })
    }, [organizations, searchTerm, tierFilter])

    return {
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
        resetForm,
        openEditDialog,
        openViewDialog,
        openCreateDialog: () => { resetForm(); setIsCreateDialogOpen(true) },
    }
}
