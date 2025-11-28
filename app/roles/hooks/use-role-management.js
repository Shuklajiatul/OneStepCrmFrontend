import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function useRoleManagement({ initialRoles = [] }) {
    const [roles, setRoles] = useState(initialRoles)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedRole, setSelectedRole] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [deleteSubmitting, setDeleteSubmitting] = useState(false)

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [roleToDelete, setRoleToDelete] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        role_name: "",
        priority: 1,
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
    const fetchRoles = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`${API_BASE_URL}/api/roles`, {
                headers: getAuthHeaders(),
                timeout: 30000,
            })

            if (response.data) {
                const roleData = Array.isArray(response.data)
                    ? response.data
                    : response.data.data || response.data.roles || []
                setRoles(roleData)
            }
        } catch (error) {
            console.error("Error fetching roles:", error)
            if (error.response?.status === 404) {
                toast.info("Roles API endpoint not found.")
                setRoles([])
            } else if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.")
            } else {
                toast.error("Failed to fetch roles.")
            }
        } finally {
            setLoading(false)
        }
    }

    const fetchRoleDetails = async (roleId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/roles/${roleId}`, {
                headers: getAuthHeaders(),
                timeout: 30000,
            })

            if (response.data) {
                const roleData = response.data.data || response.data
                setSelectedRole(roleData)
                setFormData({
                    role_name: roleData.role_name || roleData.name || "",
                    priority: roleData.priority || 1,
                })
                return roleData
            }
        } catch (error) {
            console.error("Error fetching role details:", error)
            toast.error("Failed to fetch role details")
            return null
        }
    }

    // Handlers
    const handleCreateRole = async () => {
        if (!formData.role_name || formData.role_name.trim() === "") {
            toast.error("Role name is required")
            return
        }

        if (!formData.priority || formData.priority < 1) {
            toast.error("Priority must be a positive number")
            return
        }

        try {
            setSubmitting(true)
            const payload = {
                role_name: formData.role_name.trim(),
                priority: parseInt(formData.priority) || 1,
            }

            const response = await axios.post(`${API_BASE_URL}/api/roles`, payload, {
                headers: getAuthHeaders(),
                timeout: 30000,
            })

            if (response.data) {
                toast.success("Role created successfully")
                setIsCreateDialogOpen(false)
                resetForm()
                fetchRoles()
            }
        } catch (error) {
            console.error("Error creating role:", error)
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to create role"
            toast.error(errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    const handleUpdateRole = async () => {
        if (!selectedRole?.role_id && !selectedRole?.id) return

        const roleId = selectedRole.role_id || selectedRole.id
        const currentName = selectedRole.role_name || selectedRole.name || ""
        const currentPriority = selectedRole.priority || 1

        const newName = formData.role_name?.trim() || ""
        const newPriority = parseInt(formData.priority) || 1

        if (!newName) {
            toast.error("Role name cannot be empty")
            return
        }

        if (newPriority < 1) {
            toast.error("Priority must be a positive number")
            return
        }

        try {
            setSubmitting(true)
            const payload = {}

            if (newName !== currentName) {
                payload.role_name = newName
            }

            if (newPriority !== currentPriority) {
                payload.priority = newPriority
            }

            if (Object.keys(payload).length === 0) {
                toast.info("No changes to update")
                return
            }

            // If name changed, include priority too
            if (payload.role_name && !payload.priority) {
                payload.priority = newPriority
            }

            const response = await axios.put(
                `${API_BASE_URL}/api/roles/${roleId}`,
                payload,
                {
                    headers: getAuthHeaders(),
                    timeout: 30000,
                }
            )

            if (response.data) {
                toast.success("Role updated successfully")
                setIsEditDialogOpen(false)
                resetForm()
                fetchRoles()
            }
        } catch (error) {
            console.error("Error updating role:", error)
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to update role"
            toast.error(errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteRole = async (roleId) => {
        if (!roleId) {
            toast.error("Role ID is missing. Cannot delete role.")
            return
        }

        try {
            setDeleteSubmitting(true)

            const response = await axios.delete(`${API_BASE_URL}/api/roles/${roleId}`, {
                headers: getAuthHeaders(),
                timeout: 30000,
            })

            if (response.status === 200 || response.status === 204 || response.data) {
                toast.success("Role deleted successfully")
                setRoleToDelete(null)
                fetchRoles()
            } else {
                toast.error("Unexpected response from server")
            }
        } catch (error) {
            console.error("Error deleting role:", error)
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Failed to delete role"
            toast.error(errorMessage)
        } finally {
            setDeleteSubmitting(false)
        }
    }

    const resetForm = () => {
        setFormData({
            role_name: "",
            priority: 1,
        })
        setSelectedRole(null)
    }

    const openEditDialog = async (role) => {
        setSelectedRole(role)
        const roleDetails = await fetchRoleDetails(role.role_id || role.id)
        if (roleDetails) {
            setIsEditDialogOpen(true)
        }
    }

    const openViewDialog = async (role) => {
        setSelectedRole(role)
        await fetchRoleDetails(role.role_id || role.id)
        setIsViewDialogOpen(true)
    }

    // Filtering - Memoized for performance
    const filteredRoles = useMemo(() => {
        return roles
            .filter((role) => {
                const roleName = role.role_name || role.name || ""
                const priority = role.priority?.toString() || ""
                const matchesSearch =
                    !searchTerm ||
                    roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    priority.includes(searchTerm)

                return matchesSearch
            })
            .sort((a, b) => {
                const priorityA = a.priority || 999
                const priorityB = b.priority || 999
                return priorityA - priorityB
            })
    }, [roles, searchTerm])

    return {
        roles,
        loading,
        searchTerm, setSearchTerm,
        selectedRole,
        isCreateDialogOpen, setIsCreateDialogOpen,
        isEditDialogOpen, setIsEditDialogOpen,
        isViewDialogOpen, setIsViewDialogOpen,
        roleToDelete, setRoleToDelete,
        formData, setFormData,
        submitting,
        deleteSubmitting,
        filteredRoles,
        handleCreateRole,
        handleUpdateRole,
        handleDeleteRole,
        fetchRoles,
        resetForm,
        openEditDialog,
        openViewDialog,
        openCreateDialog: () => { resetForm(); setIsCreateDialogOpen(true) },
    }
}
