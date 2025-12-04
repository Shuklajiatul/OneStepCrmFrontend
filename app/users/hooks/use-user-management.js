import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"

export function useUserManagement({ initialUsers = [], initialRoles = [], initialGenes = [], initialPolicies = [] }) {
    const [users, setUsers] = useState(initialUsers)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [roleFilter, setRoleFilter] = useState("all")
    const [selectedUser, setSelectedUser] = useState(null)

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)

    // Form states
    const [formData, setFormData] = useState({
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        password: "",
        is_active: true,
        role_id: "",
        "g_ids": "",
        "p_id": "",
        reporting_id: "",
    })
    const [roleFormData, setRoleFormData] = useState({
        role_id: "",
    })

    // Available data
    const [availableRoles, setAvailableRoles] = useState(initialRoles)
    const [availableGenes, setAvailableGenes] = useState(initialGenes)
    const [availablePolicies, setAvailablePolicies] = useState(initialPolicies)

    const [submitting, setSubmitting] = useState(false)

    // Fetchers
    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await apiClient.get('/api/users')

            if (response.data) {
                const userData = Array.isArray(response.data)
                    ? response.data
                    : response.data.data || []
                setUsers(userData)
            }
        } catch (error) {
            console.error("Error fetching users:", error)
            toast.error("Failed to fetch users.")
        } finally {
            setLoading(false)
        }
    }

    const fetchGenes = async () => {
        try {
            const response = await apiClient.get('/api/genes')

            if (response.data) {
                const allGenes = Array.isArray(response.data)
                    ? response.data
                    : response.data.data || response.data.genes || []
                setAvailableGenes(allGenes)
            }
        } catch (error) {
            console.error("Error fetching genes:", error)
            setAvailableGenes([])
        }
    }

    const fetchPolicies = async () => {
        try {
            const response = await apiClient.get('/api/policies')

            if (response.data) {
                const policyData = Array.isArray(response.data)
                    ? response.data
                    : response.data.data || response.data.policies || []
                setAvailablePolicies(policyData)
            }
        } catch (error) {
            console.error("Error fetching policies:", error)
            setAvailablePolicies([])
        }
    }

    const fetchUserDetails = async (userId) => {
        try {
            const response = await apiClient.get(`/api/users/${userId}`)

            if (response.data) {
                const userData = response.data.data || response.data
                setSelectedUser(userData)

                // Handle g_ids and p_id as arrays
                const gIdsValue = Array.isArray(userData["g_ids"])
                    ? (userData["g_ids"].length > 0 ? userData["g_ids"][0] : "")
                    : (userData["g_ids"] || "")

                const pIdValue = Array.isArray(userData["p_id"])
                    ? (userData["p_id"].length > 0 ? userData["p_id"][0] : "")
                    : (userData["p_id"] || "")

                setFormData({
                    email: userData.email || "",
                    first_name: userData.first_name || "",
                    last_name: userData.last_name || "",
                    password: "",
                    phone: userData.phone || "",
                    is_active: userData.is_active !== undefined ? userData.is_active : true,
                    role_id: userData.role_id || userData.roles?.id || userData.roles || "",
                    "g_ids": gIdsValue,
                    "p_id": pIdValue,
                    reporting_id: userData.reporting_id || userData.reports_to || userData.reporting_to || "",
                })
                return userData
            }
        } catch (error) {
            console.error("Error fetching user details:", error)
            toast.error("Failed to fetch user details")
            return null
        }
    }

    // Effect to fetch dependent data when dialogs open
    useEffect(() => {
        if (isCreateDialogOpen || isEditDialogOpen) {
            if (!loading) fetchGenes()
            fetchPolicies()
        }
    }, [isCreateDialogOpen, isEditDialogOpen, loading])

    // Handlers
    const handleCreateUser = async () => {
        if (!formData.role_id) return toast.error("Please select a role")
        if (!formData.phone) return toast.error("Please enter a phone number")
        if (!formData["g_ids"]) return toast.error("Please select a gene")

        try {
            setSubmitting(true)
            const selectedRolePriority = getSelectedRolePriority(formData.role_id)
            const payload = {
                ...formData,
                "g_ids": formData["g_ids"] || "",
                "p_id": formData["p_id"] || "",
                reporting_id: selectedRolePriority === 1 ? "" : (formData.reporting_id || ""),
            }

            const response = await apiClient.post('/api/users', payload)

            if (response.data) {
                toast.success("User created successfully")
                setIsCreateDialogOpen(false)
                resetForm()
                fetchUsers()
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to create user"
            toast.error(errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    const handleUpdateUser = async () => {
        if (!selectedUser?.user_id) return

        try {
            setSubmitting(true)
            const payload = {}

            // Compare and add changed fields
            if (formData.email !== selectedUser.email) payload.email = formData.email
            if (formData.first_name !== selectedUser.first_name) payload.first_name = formData.first_name
            if (formData.last_name !== selectedUser.last_name) payload.last_name = formData.last_name
            if (formData.phone !== selectedUser.phone) payload.phone = formData.phone
            if (formData.password && formData.password.trim() !== "") payload.password = formData.password
            if (formData.is_active !== selectedUser.is_active) payload.is_active = formData.is_active

            const currentRoleId = selectedUser.role_id || selectedUser.roles?.id || selectedUser.roles
            if (formData.role_id && formData.role_id !== currentRoleId) payload.role_id = formData.role_id

            if (formData["g_ids"] !== selectedUser["g_ids"]) payload["g_ids"] = formData["g_ids"]
            if (formData["p_id"] !== selectedUser["p_id"]) payload["p_id"] = formData["p_id"]

            const selectedRolePriority = getSelectedRolePriority(formData.role_id)
            const currentReportingId = selectedUser.reporting_id || selectedUser.reports_to || selectedUser.reporting_to || ""

            if (selectedRolePriority === 1) {
                if (currentReportingId) payload.reporting_id = ""
            } else if (formData.reporting_id !== currentReportingId) {
                payload.reporting_id = formData.reporting_id || ""
            }

            if (Object.keys(payload).length === 0) {
                toast.info("No changes to update")
                return
            }

            const response = await apiClient.patch(`/api/users/${selectedUser.user_id}`, payload)

            if (response.data) {
                toast.success("User updated successfully")
                setIsEditDialogOpen(false)
                resetForm()
                fetchUsers()
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to update user"
            toast.error(errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleStatus = async (user, newStatus) => {
        if (!user?.user_id) return toast.error("User ID is missing")

        setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, is_active: newStatus } : u))

        try {
            setSubmitting(true)
            const response = await apiClient.patch(`/api/users/${user.user_id}`, { is_active: newStatus })

            if (response.data || response.status === 200) {
                toast.success(`User ${newStatus ? "activated" : "deactivated"} successfully`)
                if (response.data?.data) {
                    setUsers(prev => prev.map(u => u.user_id === response.data.data.user_id ? { ...u, ...response.data.data } : u))
                }
            }
        } catch (error) {
            setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, is_active: !newStatus } : u))
            toast.error("Failed to update user status")
        } finally {
            setSubmitting(false)
        }
    }

    const handleAssignRole = async () => {
        if (!selectedUser?.user_id || !roleFormData.role_id) return toast.error("Please select a role")

        try {
            setSubmitting(true)
            const response = await apiClient.post(`/api/users/${selectedUser.user_id}/roles`,
                { role_id: roleFormData.role_id }
            )

            if (response.data) {
                toast.success("Role assigned successfully")
                setIsRoleDialogOpen(false)
                setRoleFormData({ role_id: "" })
                fetchUsers()
                if (isViewDialogOpen) fetchUserDetails(selectedUser.user_id)
            }
        } catch (error) {
            toast.error("Failed to assign role")
        } finally {
            setSubmitting(false)
        }
    }

    const handleRemoveRole = async (userId, roleId) => {
        try {
            setSubmitting(true)
            const response = await apiClient.delete(`/api/users/${userId}/roles/${roleId}`)

            if (response.status === 200 || response.status === 204) {
                toast.success("Role removed successfully")
                fetchUsers()
                if (isViewDialogOpen && selectedUser?.user_id === userId) fetchUserDetails(userId)
            }
        } catch (error) {
            toast.error("Failed to remove role")
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setFormData({
            email: "",
            first_name: "",
            last_name: "",
            phone: "",
            password: "",
            is_active: true,
            role_id: "",
            "g_ids": "",
            "p_id": "",
            reporting_id: "",
        })
        setSelectedUser(null)
    }

    // Helpers
    const getRoleName = (user) => {
        if (user.roles && typeof user.roles === 'string') return user.roles
        if (user.role && typeof user.role === 'string') return user.role
        if (user.role_id) {
            const role = availableRoles.find(r => (r.role_id || r.id) === user.role_id)
            return role ? (role.role_name || role.name || "Unknown Role") : "No Role"
        }
        return "No Role"
    }

    const getReportingManagerName = (user) => {
        const reportingId = user.reporting_id || user.reports_to || user.reporting_to
        if (!reportingId) return "N/A"
        const reportingToUser = users.find(u => (u.user_id || u.id) === reportingId)
        if (reportingToUser) {
            return reportingToUser.first_name || reportingToUser.last_name
                ? `${reportingToUser.first_name || ""} ${reportingToUser.last_name || ""}`.trim()
                : reportingToUser.email || `User ${reportingId}`
        }
        return `User ID: ${reportingId}`
    }

    const getSelectedRolePriority = (roleId) => {
        if (!roleId) return 999
        const role = availableRoles.find(r => (r.role_id || r.id) === roleId)
        return role?.priority !== undefined ? role.priority : 999
    }

    const getUserRolePriority = (user) => {
        if (!user) return 999
        const roleId = user.role_id || user.roles?.id || user.roles?.role_id
        if (roleId) {
            const role = availableRoles.find(r => (r.role_id || r.id) === roleId)
            if (role?.priority !== undefined) return role.priority
        }
        return 999
    }

    const getFilteredReportingUsers = (excludeUserId = null) => {
        const selectedRolePriority = getSelectedRolePriority(formData.role_id)
        return users.filter((user) => {
            if (excludeUserId && (user.user_id || user.id) === excludeUserId) return false
            const userRolePriority = getUserRolePriority(user)
            return userRolePriority < selectedRolePriority
        })
    }

    // Filtering - Memoized for performance
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch = !searchTerm ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesStatus = statusFilter === "all" ||
                (statusFilter === "active" && user.is_active === true) ||
                (statusFilter === "inactive" && user.is_active === false)

            const userRoleName = getRoleName(user)
            const matchesRole = roleFilter === "all" ||
                (userRoleName && String(userRoleName).trim().toLowerCase() === String(roleFilter).trim().toLowerCase())

            return matchesSearch && matchesStatus && matchesRole
        })
    }, [users, searchTerm, statusFilter, roleFilter])

    return {
        users,
        loading,
        searchTerm, setSearchTerm,
        statusFilter, setStatusFilter,
        roleFilter, setRoleFilter,
        selectedUser, setSelectedUser,
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
        handleCreateUser,
        handleUpdateUser,
        handleToggleStatus,
        handleAssignRole,
        handleRemoveRole,
        fetchUsers,
        fetchUserDetails,
        resetForm,
        openCreateDialog: () => { resetForm(); setIsCreateDialogOpen(true) },
        openEditDialog: async (user) => {
            setSelectedUser(user)
            const details = await fetchUserDetails(user.user_id)
            if (details) setIsEditDialogOpen(true)
        },
        openViewDialog: async (user) => {
            setSelectedUser(user)
            await fetchUserDetails(user.user_id)
            setIsViewDialogOpen(true)
        },
        openRoleDialog: async (user) => {
            setSelectedUser(user)
            await fetchUserDetails(user.user_id)
            setIsRoleDialogOpen(true)
        },
        getRoleName,
        getReportingManagerName,
        getFilteredReportingUsers,
        getSelectedRolePriority,
        getUserRolePriority
    }
}
