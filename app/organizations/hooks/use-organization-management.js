import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

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

    // Auth helpers
    const getAuthToken = () => {
        if (typeof window === "undefined") return null
        const tokens = authUtils.getTokens()
        return tokens?.accessToken || localStorage.getItem("token") || localStorage.getItem("accessToken")
    }

    const getAuthHeaders = () => {
        const bearerFromCookies = authUtils.getAuthHeader()
        const token = getAuthToken()
        const authorization = bearerFromCookies || (token ? `Bearer ${token}` : null)

        return {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(authorization && { Authorization: authorization }),
        }
    }

    // Fetchers
    const fetchOrganizations = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`${API_BASE_URL}/api/organizations`, {
                headers: getAuthHeaders(),
                timeout: 30000,
            })

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
            } else if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.")
            } else {
                toast.error("Failed to fetch organizations.")
            }
        } finally {
            setLoading(false)
        }
    }

    const fetchOrganizationDetails = async (organizationId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/organizations/${organizationId}`, {
                headers: getAuthHeaders(),
                timeout: 30000,
            })

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

            const response = await axios.post(`${API_BASE_URL}/api/organizations`, payload, {
                headers: getAuthHeaders(),
                timeout: 30000,
            })

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

            const response = await axios.put(
                `${API_BASE_URL}/api/organizations/${organizationId}`,
                payload,
                {
                    headers: getAuthHeaders(),
                    timeout: 30000,
                }
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

            const response = await axios.delete(`${API_BASE_URL}/api/organizations/${organizationId}`, {
                headers: getAuthHeaders(),
                timeout: 30000,
            })

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
