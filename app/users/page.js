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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

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
    role: "User",
  })
  const [roleFormData, setRoleFormData] = useState({
    role_id: "",
  })
  const [availableRoles, setAvailableRoles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    fetchUsers()
  }, [])

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
    console.log("Token:", token)
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

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

        if (response.data) {
        const userData = response.data.data || response.data
        setSelectedUser(userData)
        setFormData({
          email: userData.email || "",
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          password: "",
          is_active: userData.is_active !== undefined ? userData.is_active : true,
          role: userData.roles || userData.role || "User",
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
    try {
      setSubmitting(true)
      const payload = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        is_active: formData.is_active,
        role: formData.role,
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
      const currentRole = selectedUser.roles || selectedUser.role
      if (formData.role !== currentRole) payload.role = formData.role

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
      role: "User",
    })
    setSelectedUser(null)
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

  // Fixed role options
  const roleOptions = ["User", "Admin", "Manager"]

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
    // API uses 'roles' field (plural)
    const userRole = user.roles || user.role
    const matchesRole =
      roleFilter === "all" ||
      (userRole &&
        String(userRole).trim().toLowerCase() ===
          String(roleFilter).trim().toLowerCase())

    return matchesSearch && matchesStatus && matchesRole
  })

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
                  <Button onClick={resetForm}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Enter the user details below. All fields are required.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-email">Email</Label>
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
                        <Label htmlFor="create-first-name">First Name</Label>
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
                        <Label htmlFor="create-last-name">Last Name</Label>
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
                      <Label htmlFor="create-password">Password</Label>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-role">Role</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) =>
                            setFormData({ ...formData, role: value })
                          }
                        >
                          <SelectTrigger id="create-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="User">User</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-center space-x-2 pt-6">
                        <Label htmlFor="create-active" className="cursor-pointer">
                          Active
                        </Label>
                        <Switch
                          id="create-active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_active: checked })
                          }
                        />
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
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                          : "N/A"}
                      </TableCell>
                      <TableCell>{user.email || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.roles || user.role || "User"}</Badge>
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openViewDialog(user)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit User</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRoleDialog(user)}
                                className="h-8 w-8 p-0"
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manage Roles</TooltipContent>
                          </Tooltip>
                          {/* <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to deactivate{" "}
                                      <strong>
                                        {user.first_name} {user.last_name}
                                      </strong>
                                      ? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeactivateUser(user.user_id)}
                                      className="bg-destructive text-destructive-foreground"
                                      disabled={submitting}
                                    >
                                      {submitting ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Deactivating...
                                        </>
                                      ) : (
                                        "Deactivate"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TooltipTrigger>
                            <TooltipContent>Deactivate User</TooltipContent>
                          </Tooltip> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                    <Badge variant="secondary">{selectedUser.roles || selectedUser.role || "User"}</Badge>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password empty to keep current password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Leave empty to keep current password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center space-x-2 pt-6">
                <Label htmlFor="edit-active" className="cursor-pointer">
                  Active
                </Label>
                <Switch
                  id="edit-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
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
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
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

