import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"

export function useRoleManagement({ initialRoles = [] }) {
    const [roles, setRoles] = useState(initialRoles)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedRole, setSelectedRole] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        role_name: "",
    })

    // Fetchers
    const fetchRoles = async () => {
        try {
            setLoading(true)
            const response = await apiClient.get('/api/roles')

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
            } else {
                toast.error("Failed to fetch roles.")
            }
        } finally {
            setLoading(false)
        }
    }

    const fetchRoleDetails = async (roleId) => {
        try {
            const response = await apiClient.get(`/api/roles/${roleId}`)

            if (response.data) {
                const roleData = response.data.data || response.data
                setSelectedRole(roleData)
                setFormData({
                    role_name: roleData.role_name || roleData.name || "",
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

        try {
            setSubmitting(true)
            const payload = {
                role_name: formData.role_name.trim(),
            }

            const response = await apiClient.post('/api/roles', payload)

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

        const newName = formData.role_name?.trim() || ""

        if (!newName) {
            toast.error("Role name cannot be empty")
            return
        }

        try {
            setSubmitting(true)
            const payload = {}

            if (newName !== currentName) {
                payload.role_name = newName
            }

            if (Object.keys(payload).length === 0) {
                toast.info("No changes to update")
                return
            }

            const response = await apiClient.put(
                `/api/roles/${roleId}`,
                payload
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



    const resetForm = () => {
        setFormData({
            role_name: "",
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
        formData, setFormData,
        submitting,
        filteredRoles,
        handleCreateRole,
        handleUpdateRole,
        fetchRoles,
        resetForm,
        openEditDialog,
        openViewDialog,
        openCreateDialog: () => { resetForm(); setIsCreateDialogOpen(true) },
    }
}
