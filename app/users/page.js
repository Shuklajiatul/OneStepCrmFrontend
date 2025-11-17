"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import axios from "axios"
import Sidebar from "../component/sidebar"
import Topbar from "../component/topbar"
import { cn } from "@/lib/utils"
import {
  UserPlus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Users,
  Eye,
  Shield,
  ShieldCheck,
  ShieldX,
  Loader2,
  MoreVertical,
  CheckCircle2,
  XCircle,
} from "lucide-react"

// Shadcn UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
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
  const [availableRoles, setAvailableRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [availableGenes, setAvailableGenes] = useState([])
  const [genesLoading, setGenesLoading] = useState(false)
  const [availablePolicies, setAvailablePolicies] = useState([])
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  useEffect(() => {
    if (isCreateDialogOpen || isEditDialogOpen) {
      // Fetch genes only after users are loaded (for filtering mapped genes)
      if (!loading) {
        fetchGenes()
      }
      fetchPolicies()
    }
  }, [isCreateDialogOpen, isEditDialogOpen, loading])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const getAuthToken = () => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token") || localStorage.getItem("accessToken")
  }

  const getAuthHeaders = () => {
    const token = getAuthToken()
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        const userData = Array.isArray(response.data)
          ? response.data
          : response.data.data || []
        setUsers(userData)
        // Debug: Log unique roles to console to help troubleshoot filtering
        const roles = [...new Set(userData.map((u) => u.roles || u.role).filter(Boolean))]
        console.log("Available roles in user data:", roles)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to fetch users. Please check your connection and authentication.")
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      setRolesLoading(true)
      const response = await axios.get(`${API_BASE_URL}/api/roles`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        const roleData = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.roles || []
        setAvailableRoles(roleData)
        console.log("Roles fetched:", roleData)
      }
    } catch (error) {
      console.error("Error fetching roles:", error)
      if (error.response?.status === 404) {
        toast.info("Roles API endpoint not found. Using default roles.")
        setAvailableRoles([])
      } else if (error.response?.status !== 401) {
        toast.error("Failed to fetch roles. Please check your connection.")
      }
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.")
      }
    } finally {
      setRolesLoading(false)
    }
  }

  const fetchGenes = async () => {
    try {
      setGenesLoading(true)
      const response = await axios.get(`${API_BASE_URL}/api/genes`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        const allGenes = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.genes || []
        
        // Extract all unique gene IDs that are mapped to users
        const mappedGeneIds = new Set()
        users.forEach((user) => {
          if (user["g_ids"]) {
            if (Array.isArray(user["g_ids"])) {
              user["g_ids"].forEach((gId) => {
                if (gId) mappedGeneIds.add(String(gId))
              })
            } else if (user["g_ids"]) {
              mappedGeneIds.add(String(user["g_ids"]))
            }
          }
        })
        
        // Filter genes to only include those mapped to users
        const mappedGenes = allGenes.filter((gene) => {
          const geneId = String(gene.g_id || gene.id || "")
          return mappedGeneIds.has(geneId)
        })
        
        setAvailableGenes(mappedGenes)
      }
    } catch (error) {
      console.error("Error fetching genes:", error)
      if (error.response?.status !== 401) {
        toast.error("Failed to fetch genes. Please check your connection.")
      }
      setAvailableGenes([])
    } finally {
      setGenesLoading(false)
    }
  }

  const fetchPolicies = async () => {
    try {
      setPoliciesLoading(true)
      const response = await axios.get(`${API_BASE_URL}/api/policies`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        const policyData = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.policies || []
        setAvailablePolicies(policyData)
      }
    } catch (error) {
      console.error("Error fetching policies:", error)
      if (error.response?.status !== 401) {
        toast.error("Failed to fetch policies. Please check your connection.")
      }
      setAvailablePolicies([])
    } finally {
      setPoliciesLoading(false)
    }
  }

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        const userData = response.data.data || response.data
        setSelectedUser(userData)
        // Handle g_ids and p_id as arrays - take first element if array, otherwise use as is
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

  const handleCreateUser = async () => {
    if (!formData.role_id) {
      toast.error("Please select a role")
      return
    }

    try {
      setSubmitting(true)
      const selectedRolePriority = getSelectedRolePriority(formData.role_id)
      const payload = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        is_active: formData.is_active,
        role_id: formData.role_id,
        "g_ids": formData["g_ids"] || "",
        "p_id": formData["p_id"] || "",
        // For priority 1, don't send reporting_id (send empty/null)
        reporting_id: selectedRolePriority === 1 ? "" : (formData.reporting_id || ""),
      }

      const response = await axios.post(`${API_BASE_URL}/api/users`, payload, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        toast.success("User created successfully")
        setIsCreateDialogOpen(false)
        resetForm()
        fetchUsers()
      }
    } catch (error) {
      console.error("Error creating user:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to create user"
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

      // Only include fields that have been changed or are not empty
      if (formData.email !== selectedUser.email) payload.email = formData.email
      if (formData.first_name !== selectedUser.first_name) payload.first_name = formData.first_name
      if (formData.last_name !== selectedUser.last_name) payload.last_name = formData.last_name
      if (formData.password && formData.password.trim() !== "")
        payload.password = formData.password
      if (formData.is_active !== selectedUser.is_active)
        payload.is_active = formData.is_active
      const currentRoleId = selectedUser.role_id || selectedUser.roles?.id || selectedUser.roles
      if (formData.role_id && formData.role_id !== currentRoleId) payload.role_id = formData.role_id
      
      // Add gene and policy fields
      if (formData["g_ids"] !== selectedUser["g_ids"]) payload["g_ids"] = formData["g_ids"]
      if (formData["p_id"] !== selectedUser["p_id"]) payload["p_id"] = formData["p_id"]
      
      // Add reporting_id field - but not for priority 1
      const selectedRolePriority = getSelectedRolePriority(formData.role_id)
      const currentReportingId = selectedUser.reporting_id || selectedUser.reports_to || selectedUser.reporting_to || ""
      // For priority 1, always set reporting_id to empty
      if (selectedRolePriority === 1) {
        if (currentReportingId) {
          payload.reporting_id = ""
        }
      } else if (formData.reporting_id !== currentReportingId) {
        payload.reporting_id = formData.reporting_id || ""
      }

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to update")
        return
      }

      const response = await axios.patch(
        `${API_BASE_URL}/api/users/${selectedUser.user_id}`,
        payload,
        {
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      )

      if (response.data) {
        toast.success("User updated successfully")
        setIsEditDialogOpen(false)
        resetForm()
        fetchUsers()
      }
    } catch (error) {
      console.error("Error updating user:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to update user"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (user, newStatus) => {
    if (!user?.user_id) {
      toast.error("User ID is missing. Cannot update status.")
      return
    }

    // Optimistically update the UI
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.user_id === user.user_id ? { ...u, is_active: newStatus } : u
      )
    )

    try {
      setSubmitting(true)
      const payload = {
        is_active: newStatus,
      }

      const response = await axios.patch(
        `${API_BASE_URL}/api/users/${user.user_id}`,
        payload,
        {
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      )

      if (response.data || response.status === 200 || response.status === 204) {
        toast.success(
          `User ${newStatus ? "activated" : "deactivated"} successfully`
        )
        // Update the user with any returned data from the API
        if (response.data?.data || response.data) {
          const updatedUser = response.data.data || response.data
          setUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.user_id === updatedUser.user_id
                ? { ...u, ...updatedUser }
                : u
            )
          )
        }
      }
    } catch (error) {
      console.error("Error updating user status:", error)
      // Revert the optimistic update on error
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.user_id === user.user_id ? { ...u, is_active: !newStatus } : u
        )
      )
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update user status"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivateUser = async (userId) => {
    if (!userId) {
      toast.error("User ID is missing. Cannot deactivate user.")
      return
    }

    try {
      setSubmitting(true)
      console.log("Deactivating user with ID:", userId)
      console.log("API URL:", `${API_BASE_URL}/api/users/${userId}`)

      const response = await axios.delete(`${API_BASE_URL}/api/users/${userId}`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      console.log("Deactivate response:", response.status, response.data)

      if (response.status === 200 || response.status === 204 || response.data) {
        toast.success("User deactivated successfully")
        fetchUsers()
      } else {
        toast.error("Unexpected response from server")
      }
    } catch (error) {
      console.error("Error deactivating user:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)
      console.error("User ID attempted:", userId)

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to deactivate user"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignRole = async () => {
    if (!selectedUser?.user_id || !roleFormData.role_id) {
      toast.error("Please select a role")
      return
    }

    try {
      setSubmitting(true)
      const response = await axios.post(
        `${API_BASE_URL}/api/users/${selectedUser.user_id}/roles`,
        { role_id: roleFormData.role_id },
        {
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      )

      if (response.data) {
        toast.success("Role assigned successfully")
        setIsRoleDialogOpen(false)
        setRoleFormData({ role_id: "" })
        fetchUsers()
        // Refresh user details if viewing
        if (isViewDialogOpen) {
          fetchUserDetails(selectedUser.user_id)
        }
      }
    } catch (error) {
      console.error("Error assigning role:", error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to assign role"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveRole = async (userId, roleId) => {
    try {
      setSubmitting(true)
      const response = await axios.delete(
        `${API_BASE_URL}/api/users/${userId}/roles/${roleId}`,
        {
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      )

      if (response.status === 200 || response.status === 204) {
        toast.success("Role removed successfully")
        fetchUsers()
        // Refresh user details if viewing
        if (isViewDialogOpen && selectedUser?.user_id === userId) {
          fetchUserDetails(userId)
        }
      }
    } catch (error) {
      console.error("Error removing role:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to remove role"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      is_active: true,
      role_id: "",
      "g_ids": "",
      "p_id": "",
      reporting_id: "",
    })
    setSelectedUser(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = async (user) => {
    setSelectedUser(user)
    const userDetails = await fetchUserDetails(user.user_id)
    if (userDetails) {
      setIsEditDialogOpen(true)
    }
  }

  const openViewDialog = async (user) => {
    setSelectedUser(user)
    await fetchUserDetails(user.user_id)
    setIsViewDialogOpen(true)
  }

  const openRoleDialog = async (user) => {
    setSelectedUser(user)
    await fetchUserDetails(user.user_id)
    setIsRoleDialogOpen(true)
  }

  // Get role options from API or use fallback
  const roleOptions = availableRoles.length > 0
    ? availableRoles
    : []

  // Helper function to get role name from role_id
  const getRoleName = (user) => {
    if (user.roles && typeof user.roles === 'string') {
      return user.roles
    }
    if (user.role && typeof user.role === 'string') {
      return user.role
    }
    if (user.role_id) {
      const role = availableRoles.find(r => (r.role_id || r.id) === user.role_id)
      if (role) {
        return role.role_name || role.name || "Unknown Role"
      }
      return "No Role"
    }
    return "No Role"
  }

  // Helper function to get reporting manager name
  const getReportingManagerName = (user) => {
    const reportingId = user.reporting_id || user.reports_to || user.reporting_to
    if (!reportingId) {
      return "N/A"
    }
    const reportingToUser = users.find(u => (u.user_id || u.id) === reportingId)
    if (reportingToUser) {
      const userName = reportingToUser.first_name || reportingToUser.last_name
        ? `${reportingToUser.first_name || ""} ${reportingToUser.last_name || ""}`.trim()
        : reportingToUser.email || `User ${reportingId}`
      return userName
    }
    return `User ID: ${reportingId}`
  }

  // Helper function to get a user's role priority
  const getUserRolePriority = (user) => {
    if (!user) return 999 // Default to lowest priority
    
    // Try to find role by role_id
    const roleId = user.role_id || user.roles?.id || user.roles?.role_id
    if (roleId) {
      const role = availableRoles.find(r => (r.role_id || r.id) === roleId)
      if (role && role.priority !== undefined) {
        return role.priority
      }
    }
    
    // Try to find role by role name (string)
    if (user.roles && typeof user.roles === 'string') {
      const role = availableRoles.find(r => 
        (r.role_name || r.name || '').toLowerCase() === user.roles.toLowerCase()
      )
      if (role && role.priority !== undefined) {
        return role.priority
      }
    }
    
    if (user.role && typeof user.role === 'string') {
      const role = availableRoles.find(r => 
        (r.role_name || r.name || '').toLowerCase() === user.role.toLowerCase()
      )
      if (role && role.priority !== undefined) {
        return role.priority
      }
    }
    
    return 999 // Default to lowest priority if not found
  }

  // Helper function to get selected role's priority
  const getSelectedRolePriority = (roleId) => {
    if (!roleId) return 999
    
    const role = availableRoles.find(r => (r.role_id || r.id) === roleId)
    if (role && role.priority !== undefined) {
      return role.priority
    }
    
    return 999 // Default to lowest priority if not found
  }

  // Helper function to filter users for reporting dropdown based on role priority
  const getFilteredReportingUsers = (excludeUserId = null) => {
    const selectedRolePriority = getSelectedRolePriority(formData.role_id)
    
    return users.filter((user) => {
      // Exclude current user if editing
      if (excludeUserId && (user.user_id || user.id) === excludeUserId) {
        return false
      }
      
      // Get user's role priority
      const userRolePriority = getUserRolePriority(user)
      
      // Only show users whose role priority is less than selected role priority
      // (lower priority number = higher in hierarchy)
      return userRolePriority < selectedRolePriority
    })
  }

  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch =
      !searchTerm ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())

    // Status filter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active === true) ||
      (statusFilter === "inactive" && user.is_active === false)

    // Role filter - case insensitive comparison with trim
    const userRoleName = getRoleName(user)
    const matchesRole =
      roleFilter === "all" ||
      (userRoleName &&
        String(userRoleName).trim().toLowerCase() ===
        String(roleFilter).trim().toLowerCase())

    return matchesSearch && matchesStatus && matchesRole
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, roleFilter])

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  return (
    <main className="min-h-screen bg-background">
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <div className="flex min-h-screen">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <section className={cn(
          "flex-1 transition-all duration-300 flex flex-col min-h-screen",
          isCollapsed ? "md:ml-0" : "md:ml-0"
        )}>
          <div className="p-4 border-b border-border bg-card/50">
            <Topbar
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              toggleSidebar={toggleSidebar}
            />
          </div>
          <div className="flex-1 p-4 md:p-6 bg-background">
            <div className="container mx-auto py-6 space-y-6">
              {/* Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <Users className="h-6 w-6" />
                        User Management
                      </CardTitle>
                      <CardDescription>
                        Manage users, roles, and permissions for your organization
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                          <Button onClick={openCreateDialog}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create User
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                            <DialogDescription>
                              Enter the user details below. All required fields must be filled.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto px-1">
                            <div className="space-y-5 py-4">
                              {/* Basic Information Section */}
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-semibold mb-3 text-foreground">Basic Information</h4>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="create-email">Email <span className="text-destructive">*</span></Label>
                                  <Input
                                    id="create-email"
                                    type="email"
                                    placeholder="bob@acme.com"
                                    value={formData.email}
                                    onChange={(e) =>
                                      setFormData({ ...formData, email: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="create-first-name">First Name <span className="text-destructive">*</span></Label>
                                    <Input
                                      id="create-first-name"
                                      placeholder="Bob"
                                      value={formData.first_name}
                                      onChange={(e) =>
                                        setFormData({ ...formData, first_name: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="create-last-name">Last Name <span className="text-destructive">*</span></Label>
                                    <Input
                                      id="create-last-name"
                                      placeholder="Jones"
                                      value={formData.last_name}
                                      onChange={(e) =>
                                        setFormData({ ...formData, last_name: e.target.value })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="create-password">Password <span className="text-destructive">*</span></Label>
                                  <Input
                                    id="create-password"
                                    type="password"
                                    placeholder="UserPass123"
                                    value={formData.password}
                                    onChange={(e) =>
                                      setFormData({ ...formData, password: e.target.value })
                                    }
                                  />
                                </div>
                              </div>

                              <Separator />

                              {/* Role & Permissions Section */}
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-semibold mb-3 text-foreground">Role & Permissions</h4>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="create-role">Role <span className="text-destructive">*</span></Label>
                                  <Select
                                    value={formData.role_id}
                                    onValueChange={(value) => {
                                      const newRolePriority = getSelectedRolePriority(value)
                                      // If priority is 1, clear reporting_id (highest priority doesn't report to anyone)
                                      let validReportingId = ""
                                      if (newRolePriority === 1) {
                                        validReportingId = ""
                                      } else if (formData.reporting_id) {
                                        // Check if current reporting_id is still valid
                                        validReportingId = formData.reporting_id
                                        const reportingUser = users.find(u => (u.user_id || u.id) === formData.reporting_id)
                                        if (reportingUser) {
                                          const reportingUserPriority = getUserRolePriority(reportingUser)
                                          // If reporting user's priority is not less than new role priority, clear it
                                          if (reportingUserPriority >= newRolePriority) {
                                            validReportingId = ""
                                          }
                                        }
                                      }
                                      setFormData({ ...formData, role_id: value, reporting_id: validReportingId })
                                    }}
                                    disabled={rolesLoading}
                                  >
                                    <SelectTrigger id="create-role">
                                      <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select role"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {roleOptions.length === 0 && !rolesLoading ? (
                                        <SelectItem value="" disabled>No roles available</SelectItem>
                                      ) : (
                                        roleOptions.map((role) => {
                                          const roleId = role.role_id || role.id
                                          const roleName = role.role_name || role.name || role
                                          return (
                                            <SelectItem key={roleId} value={roleId}>
                                              {roleName}
                                            </SelectItem>
                                          )
                                        })
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="create-gene">Gene</Label>
                                    <Select
                                      value={formData["g_ids"] || undefined}
                                      onValueChange={(value) =>
                                        setFormData({ ...formData, "g_ids": value === "__clear__" ? "" : value })
                                      }
                                      disabled={genesLoading}
                                    >
                                      <SelectTrigger id="create-gene">
                                        <SelectValue placeholder={genesLoading ? "Loading genes..." : "Select gene (optional)"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableGenes.length === 0 && !genesLoading ? (
                                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No genes available</div>
                                        ) : (
                                          <>
                                            {formData["g_ids"] && (
                                              <SelectItem value="__clear__">Clear selection</SelectItem>
                                            )}
                                            {availableGenes.map((gene) => {
                                              const geneId = gene.g_id || gene.id
                                              const geneName = gene.name || gene.g_name || `Gene ${geneId}`
                                              return (
                                                <SelectItem key={geneId} value={geneId}>
                                                  {geneName}
                                                </SelectItem>
                                              )
                                            })}
                                          </>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="create-policy">Policy</Label>
                                    <Select
                                      value={formData["p_id"] || undefined}
                                      onValueChange={(value) =>
                                        setFormData({ ...formData, "p_id": value === "__clear__" ? "" : value })
                                      }
                                      disabled={policiesLoading}
                                    >
                                      <SelectTrigger id="create-policy">
                                        <SelectValue placeholder={policiesLoading ? "Loading policies..." : "Select policy (optional)"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availablePolicies.length === 0 && !policiesLoading ? (
                                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No policies available</div>
                                        ) : (
                                          <>
                                            {formData["p_id"] && (
                                              <SelectItem value="__clear__">Clear selection</SelectItem>
                                            )}
                                            {availablePolicies.map((policy) => {
                                              const policyId = policy.p_id || policy.policy_id || policy.id
                                              const policyName = policy.p_name || policy.policy_name || policy.name || `Policy ${policyId}`
                                              return (
                                                <SelectItem key={policyId} value={policyId}>
                                                  {policyName}
                                                </SelectItem>
                                              )
                                            })}
                                          </>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Reporting Section */}
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-semibold mb-3 text-foreground">Reporting Structure</h4>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="create-reports-to">Reporting to</Label>
                                  <Select
                                    value={formData.reporting_id || undefined}
                                    onValueChange={(value) =>
                                      setFormData({ ...formData, reporting_id: value === "__clear__" ? "" : value })
                                    }
                                    disabled={loading || !formData.role_id}
                                  >
                                    <SelectTrigger id="create-reports-to">
                                      <SelectValue placeholder={
                                        !formData.role_id 
                                          ? "Select role first" 
                                          : loading 
                                            ? "Loading users..." 
                                            : "Select user (optional)"
                                      } />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {!formData.role_id ? (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Please select a role first</div>
                                      ) : (() => {
                                        const filteredUsers = getFilteredReportingUsers()
                                        return filteredUsers.length === 0 ? (
                                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No users available with higher priority</div>
                                        ) : (
                                          <>
                                            {formData.reporting_id && (
                                              <SelectItem value="__clear__">Clear selection</SelectItem>
                                            )}
                                            {filteredUsers.map((user) => {
                                              const userId = user.user_id || user.id
                                              const userName = user.first_name || user.last_name
                                                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                                : user.email || `User ${userId}`
                                              return (
                                                <SelectItem key={userId} value={userId}>
                                                  {userName} {user.email ? `(${user.email})` : ""}
                                                </SelectItem>
                                              )
                                            })}
                                          </>
                                        )
                                      })()}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <Separator />

                              {/* Status Section */}
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-semibold mb-3 text-foreground">Status</h4>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    id="create-active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) =>
                                      setFormData({ ...formData, is_active: checked })
                                    }
                                  />
                                  <Label htmlFor="create-active" className="cursor-pointer font-normal">
                                    User is active
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsCreateDialogOpen(false)}
                              disabled={submitting}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleCreateUser} disabled={submitting}>
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                "Create User"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filters */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    {/* Search - Left side */}
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Filters - Right side */}
                    <div className="flex items-center gap-2">
                      {/* Status Filter */}
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Role Filter */}
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          {roleOptions.map((role) => {
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

                      {/* Clear Filters Button */}
                      {(statusFilter !== "all" || roleFilter !== "all" || searchTerm) && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm("")
                            setStatusFilter("all")
                            setRoleFilter("all")
                          }}
                          className="whitespace-nowrap"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Users Table */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No users found</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden w-full">
                      <div className="overflow-x-auto w-full">
                        <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                          <Table className="w-full table-auto">
                            <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-semibold text-foreground">Name</TableHead>
                                <TableHead className="font-semibold text-foreground">Email</TableHead>
                                <TableHead className="font-semibold text-foreground">Role</TableHead>
                                <TableHead className="font-semibold text-foreground">Reporting</TableHead>
                                <TableHead className="font-semibold text-foreground">Status</TableHead>
                                <TableHead className="w-[120px] whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedUsers.map((user) => (
                                <TableRow 
                                  key={user.user_id}
                                  className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                >
                                  <TableCell className="py-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="min-w-0">
                                        <span className="font-medium text-primary truncate text-sm md:text-base transition-colors">
                                          {user.first_name || user.last_name
                                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                            : "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4">{user.email || "N/A"}</TableCell>
                                  <TableCell className="py-4">
                                    <Badge variant="secondary">{getRoleName(user)}</Badge>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <span className="text-sm text-foreground">
                                      {getReportingManagerName(user)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={user.is_active}
                                        onCheckedChange={(checked) =>
                                          handleToggleStatus(user, checked)
                                        }
                                        disabled={submitting}
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {user.is_active ? "Active" : "Inactive"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="w-[120px] whitespace-nowrap text-right py-4">
                                    <div className="flex items-center justify-end space-x-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openViewDialog(user)}
                                        title="View"
                                        className="h-8 w-8"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditDialog(user)}
                                        title="Edit"
                                        className="h-8 w-8"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openRoleDialog(user)}
                                        title="Manage Roles"
                                        className="h-8 w-8"
                                      >
                                        <Shield className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pagination */}
                  {filteredUsers.length > 0 && (
                    <div className="mt-6 px-4 sm:px-0 pb-4 sm:pb-0">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                          {/* Items per page selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Show</span>
                            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
                          </div>

                          {/* Page info */}
                          <div className="text-sm text-muted-foreground whitespace-nowrap">
                            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                          </div>
                        </div>

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>

                              {/* Show limited page numbers for better UX */}
                              {(() => {
                                const pages = [];
                                const maxVisiblePages = 5;
                                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                // Adjust start page if we're near the end
                                if (endPage - startPage + 1 < maxVisiblePages) {
                                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                }

                                for (let i = startPage; i <= endPage; i++) {
                                  pages.push(
                                    <PaginationItem key={i}>
                                      <PaginationLink
                                        onClick={() => setCurrentPage(i)}
                                        isActive={currentPage === i}
                                        className="cursor-pointer"
                                      >
                                        {i}
                                      </PaginationLink>
                                    </PaginationItem>
                                  );
                                }
                                return pages;
                              })()}

                              <PaginationItem>
                                <PaginationNext
                                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* View User Dialog */}
              <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>User Details</DialogTitle>
                    <DialogDescription>View detailed information about this user</DialogDescription>
                  </DialogHeader>
                  {selectedUser && (
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">First Name</Label>
                          <p className="text-sm font-medium">{selectedUser.first_name || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Last Name</Label>
                          <p className="text-sm font-medium">{selectedUser.last_name || "N/A"}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="text-sm font-medium">{selectedUser.email || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Role</Label>
                          <p className="text-sm font-medium">
                            <Badge variant="secondary">{selectedUser ? getRoleName(selectedUser) : "No Role"}</Badge>
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Status</Label>
                          <p className="text-sm font-medium">
                            {selectedUser.is_active ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-500">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </p>
                        </div>
                      </div>
                      {selectedUser.reporting_id || selectedUser.reports_to || selectedUser.reporting_to ? (
                        <div>
                          <Label className="text-muted-foreground">Reporting to</Label>
                          <p className="text-sm font-medium">
                            {(() => {
                              const reportingId = selectedUser.reporting_id || selectedUser.reports_to || selectedUser.reporting_to
                              const reportingToUser = users.find(u => (u.user_id || u.id) === reportingId)
                              if (reportingToUser) {
                                const userName = reportingToUser.first_name || reportingToUser.last_name
                                  ? `${reportingToUser.first_name || ""} ${reportingToUser.last_name || ""}`.trim()
                                  : reportingToUser.email || `User ${reportingId}`
                                return `${userName}${reportingToUser.email ? ` (${reportingToUser.email})` : ""}`
                              }
                              return `User ID: ${reportingId}`
                            })()}
                          </p>
                        </div>
                      ) : null}
                      {selectedUser.user_id && (
                        <div>
                          <Label className="text-muted-foreground">User ID</Label>
                          <p className="text-sm font-medium font-mono">{selectedUser.user_id}</p>
                        </div>
                      )}
                      {selectedUser.roles && Array.isArray(selectedUser.roles) && selectedUser.roles.length > 0 && (
                        <div>
                          <Separator className="my-4" />
                          <Label className="text-muted-foreground mb-2 block">Assigned Roles</Label>
                          <div className="space-y-2">
                            {selectedUser.roles.map((role, index) => (
                              <div
                                key={role.id || index}
                                className="flex items-center justify-between p-2 border rounded-md"
                              >
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4 text-primary" />
                                  <span className="text-sm">{role.name || role.role_name || role.id}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveRole(selectedUser.user_id, role.id)}
                                  disabled={submitting}
                                >
                                  <ShieldX className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                      Close
                    </Button>
                    <Button onClick={() => openEditDialog(selectedUser)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit User Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                      Update user information. Leave password empty to keep the current password.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-1">
                    <div className="space-y-5 py-4">
                      {/* Basic Information Section */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-3 text-foreground">Basic Information</h4>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            placeholder="bob@acme.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-first-name">First Name</Label>
                            <Input
                              id="edit-first-name"
                              placeholder="Bob"
                              value={formData.first_name}
                              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-last-name">Last Name</Label>
                            <Input
                              id="edit-last-name"
                              placeholder="Jones"
                              value={formData.last_name}
                              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-password">New Password</Label>
                          <Input
                            id="edit-password"
                            type="password"
                            placeholder="Leave empty to keep current password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Leave blank to keep the current password unchanged.
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Role & Permissions Section */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-3 text-foreground">Role & Permissions</h4>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-role">Role</Label>
                          <Select
                            value={formData.role_id}
                            onValueChange={(value) => {
                              const newRolePriority = getSelectedRolePriority(value)
                              // If priority is 1, clear reporting_id (highest priority doesn't report to anyone)
                              let validReportingId = ""
                              if (newRolePriority === 1) {
                                validReportingId = ""
                              } else if (formData.reporting_id) {
                                // Check if current reporting_id is still valid
                                validReportingId = formData.reporting_id
                                const reportingUser = users.find(u => (u.user_id || u.id) === formData.reporting_id)
                                if (reportingUser) {
                                  const reportingUserPriority = getUserRolePriority(reportingUser)
                                  // If reporting user's priority is not less than new role priority, clear it
                                  if (reportingUserPriority >= newRolePriority) {
                                    validReportingId = ""
                                  }
                                }
                              }
                              setFormData({ ...formData, role_id: value, reporting_id: validReportingId })
                            }}
                            disabled={rolesLoading}
                          >
                            <SelectTrigger id="edit-role">
                              <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select role"} />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.length === 0 && !rolesLoading ? (
                                <SelectItem value="" disabled>No roles available</SelectItem>
                              ) : (
                                roleOptions.map((role) => {
                                  const roleId = role.role_id || role.id
                                  const roleName = role.role_name || role.name || role
                                  return (
                                    <SelectItem key={roleId} value={roleId}>
                                      {roleName}
                                    </SelectItem>
                                  )
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-gene">Gene</Label>
                            <Select
                              value={formData["g_ids"] || undefined}
                              onValueChange={(value) =>
                                setFormData({ ...formData, "g_ids": value === "__clear__" ? "" : value })
                              }
                              disabled={genesLoading}
                            >
                              <SelectTrigger id="edit-gene">
                                <SelectValue placeholder={genesLoading ? "Loading genes..." : "Select gene (optional)"} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableGenes.length === 0 && !genesLoading ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No genes available</div>
                                ) : (
                                  <>
                                    {formData["g_ids"] && (
                                      <SelectItem value="__clear__">Clear selection</SelectItem>
                                    )}
                                    {availableGenes.map((gene) => {
                                      const geneId = gene.g_id || gene.id
                                      const geneName = gene.name || gene.g_name || `Gene ${geneId}`
                                      return (
                                        <SelectItem key={geneId} value={geneId}>
                                          {geneName}
                                        </SelectItem>
                                      )
                                    })}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-policy">Policy</Label>
                            <Select
                              value={formData["p_id"] || undefined}
                              onValueChange={(value) =>
                                setFormData({ ...formData, "p_id": value === "__clear__" ? "" : value })
                              }
                              disabled={policiesLoading}
                            >
                              <SelectTrigger id="edit-policy">
                                <SelectValue placeholder={policiesLoading ? "Loading policies..." : "Select policy (optional)"} />
                              </SelectTrigger>
                              <SelectContent>
                                {availablePolicies.length === 0 && !policiesLoading ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No policies available</div>
                                ) : (
                                  <>
                                    {formData["p_id"] && (
                                      <SelectItem value="__clear__">Clear selection</SelectItem>
                                    )}
                                    {availablePolicies.map((policy) => {
                                      const policyId = policy.p_id || policy.policy_id || policy.id
                                      const policyName = policy.p_name || policy.policy_name || policy.name || `Policy ${policyId}`
                                      return (
                                        <SelectItem key={policyId} value={policyId}>
                                          {policyName}
                                        </SelectItem>
                                      )
                                    })}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Reporting Section */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-3 text-foreground">Reporting Structure</h4>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-reports-to">Reporting to</Label>
                          <Select
                            value={formData.reporting_id || undefined}
                            onValueChange={(value) =>
                              setFormData({ ...formData, reporting_id: value === "__clear__" ? "" : value })
                            }
                            disabled={loading || !formData.role_id}
                          >
                            <SelectTrigger id="edit-reports-to">
                              <SelectValue placeholder={
                                !formData.role_id 
                                  ? "Select role first" 
                                  : loading 
                                    ? "Loading users..." 
                                    : "Select user (optional)"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {!formData.role_id ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">Please select a role first</div>
                              ) : (() => {
                                const filteredUsers = getFilteredReportingUsers(selectedUser?.user_id)
                                return filteredUsers.length === 0 ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No users available with higher priority</div>
                                ) : (
                                  <>
                                    {formData.reporting_id && (
                                      <SelectItem value="__clear__">Clear selection</SelectItem>
                                    )}
                                    {filteredUsers.map((user) => {
                                      const userId = user.user_id || user.id
                                      const userName = user.first_name || user.last_name
                                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                        : user.email || `User ${userId}`
                                      return (
                                        <SelectItem key={userId} value={userId}>
                                          {userName} {user.email ? `(${user.email})` : ""}
                                        </SelectItem>
                                      )
                                    })}
                                  </>
                                )
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator />

                      {/* Status Section */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-3 text-foreground">Status</h4>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Switch
                            id="edit-active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, is_active: checked })
                            }
                          />
                          <Label htmlFor="edit-active" className="cursor-pointer font-normal">
                            User is active
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateUser} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update User"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Role Management Dialog */}
              <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Manage Roles</DialogTitle>
                    <DialogDescription>
                      Assign or remove roles for {selectedUser?.first_name} {selectedUser?.last_name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Handle roles as string (current API format) */}
                    {selectedUser?.roles && typeof selectedUser.roles === 'string' && (
                      <div>
                        <Label className="mb-2 block">Current Role</Label>
                        <div className="p-3 border rounded-md">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <span>{selectedUser.roles}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Handle roles as array (for future compatibility) */}
                    {selectedUser?.roles && Array.isArray(selectedUser.roles) && selectedUser.roles.length > 0 && (
                      <div>
                        <Label className="mb-2 block">Current Roles</Label>
                        <div className="space-y-2">
                          {selectedUser.roles.map((role, index) => (
                            <div
                              key={role.id || index}
                              className="flex items-center justify-between p-3 border rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <span>{role.name || role.role_name || role.id}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRole(selectedUser.user_id, role.id)}
                                disabled={submitting}
                              >
                                <ShieldX className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="role-select">Assign New Role</Label>
                      <div className="flex gap-2">
                        <Select
                          value={roleFormData.role_id}
                          onValueChange={(value) =>
                            setRoleFormData({ ...roleFormData, role_id: value })
                          }
                        >
                          <SelectTrigger id="role-select" className="flex-1">
                            <SelectValue placeholder="Select a role to assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.length === 0 ? (
                              <SelectItem value="" disabled>No roles available. Please fetch roles first.</SelectItem>
                            ) : (
                              availableRoles.map((role) => {
                                const roleId = role.role_id || role.id
                                const roleName = role.role_name || role.name || role
                                return (
                                  <SelectItem key={roleId} value={roleId}>
                                    {roleName}
                                  </SelectItem>
                                )
                              })
                            )}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAssignRole} disabled={submitting || !roleFormData.role_id}>
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Assigning...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Assign
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}